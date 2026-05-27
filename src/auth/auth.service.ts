import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User } from '@prisma/client'
import { hash, verify } from 'argon2'
import { Request, Response } from 'express'

import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { MailService } from '@/libs/mail/mail.service'

import { LoginDto } from './dto/login.dto'
import { RegisterStudentDto } from './dto/register-student.dto'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
import { UserEntity } from '@/user/entities/user.entity'

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  /**
   * Logs in a user.
   * If two-factor authentication is enabled, sends a code to the email.
   * @param req - The Express request object.
   * @param dto - The user login data (email, password, optional 2FA code).
   * @returns The user or a message about the need for a 2FA code.
   * @throws NotFoundException if the user is not found.
   * @throws UnauthorizedException if the password is incorrect or account is deactivated.
   */
  public async login(req: Request, dto: LoginDto): Promise<{ message: string } | { user: UserEntity }> {
    const user = await this.userService.findByEmail(dto.email!)

    if (!user || !user.password) {
      throw new NotFoundException(
        'Користувача не знайдено. Будь ласка, перевірте введені дані.'
      )
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Ваш акаунт деактивовано. Зверніться до адміністратора.'
      )
    }

    const isValidPassword = await verify(user.password, dto.password!)

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Невірний пароль. Будь ласка, спробуйте ще раз або відновіть пароль.'
      )
    }

    if (user.isTwoFactorEnabled) {
      if (!dto.code) {
        await this.twoFactorAuthService.sendTwoFactorToken(user.email)

        return {
          message:
            'Перевірте вашу поштову адресу. Потрібен код двофакторної аутентифікації.'
        }
      }

      await this.twoFactorAuthService.validateTwoFactorToken(user.email, dto.code)
    }

    return this.saveSession(req, user)
  }

  /**
   * Registers a new student.
   * Verifies identity via ЄДЕБО data, creates User + Student records.
   * @param req - The Express request object.
   * @param dto - The student registration data from the sign-up form.
   * @returns An object with the created user after session save.
   * @throws BadRequestException if consent is not given.
   * @throws BadRequestException if document data is insufficient for identification.
   * @throws ConflictException if a user with this email already exists.
   * @throws NotFoundException if the student is not found in ЄДЕБО records.
   */
  public async register_student(req: Request, dto: RegisterStudentDto): Promise<{ user: UserEntity }> {
    // 1. Перевірка згоди на обробку персональних даних
    if (!dto.consent) {
      throw new BadRequestException(
        'Необхідно надати згоду на обробку персональних даних.'
      )
    }

    // 2. Перевірка унікальності email
    const existingUser = await this.userService.findByEmail(dto.email)
    if (existingUser) {
      throw new ConflictException(
        'Користувач з такою email-адресою вже зареєстрований.'
      )
    }

    // 3. Пошук студента в ЄДЕБО через наявні документи
    const edeboStudent = await this.findStudentInEdebo(dto)

    // 4. Перевірка: чи студент вже прив'язаний до акаунту
    const alreadyLinked = await this.prisma.student.findFirst({
      where: {
        personId: edeboStudent.personId,
        universityId: edeboStudent.universityId,
        NOT: { userId: { equals: null } } // ✅ виправлено
      }
    })

    if (alreadyLinked) {
      throw new ConflictException(
        'Цей студент вже має зареєстрований акаунт в системі.'
      )
    }

    // 5. Хешування пароля
    const hashedPassword = await hash(dto.password)

    // 6. Створення User + прив'язка Student в одній транзакції
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: 'STUDENT'
        }
      })

      await tx.student.update({
        where: { id: edeboStudent.id },
        data: {
          userId: createdUser.id,
          rnokpp: dto.no_rnokpp ? '' : (dto.rnokpp ?? ''),
          passportDocumentSeries: dto.no_student_ticket
            ? (dto.serial_passport ?? '')
            : (dto.serial_ticket ?? ''),
          passportDocumentNumbers: dto.no_student_ticket
            ? (dto.number_passport ?? '')
            : (dto.number_ticket ?? '')
        }
      })

      return createdUser
    })

    // 7. Збереження сесії та повернення результату
    return this.saveSession(req, user)
  }

  /**
   * Finds a pre-imported student in the local ЄДЕБО-synced database by available documents.
   * The student record must not yet be linked to any user account (userId = null).
   * Priority: RNOKPP → student ticket → passport series + number.
   * @param dto - The registration DTO with document fields.
   * @returns The found Student record or throws BadRequestException.
   * @throws BadRequestException if no identification document is provided.
   */
  private async findStudentInEdebo(dto: RegisterStudentDto) {
    // Варіант 1: пошук по РНОКПП
    if (!dto.no_rnokpp && dto.rnokpp) {
      const student = await this.prisma.student.findFirst({
        where: {
          rnokpp: dto.rnokpp,
          userId: { equals: null } // ✅
        }
      })
      if (student) return student
    }

    // Варіант 2: пошук по студентському квитку
    if (!dto.no_student_ticket && dto.serial_ticket && dto.number_ticket) {
      const student = await this.prisma.student.findFirst({
        where: {
          passportDocumentSeries: dto.serial_ticket,
          passportDocumentNumbers: dto.number_ticket,
          userId: { equals: null } // ✅ виправлено з null
        }
      })
      if (student) return student
    }

    // Варіант 3: пошук по паспорту (fallback)
    if (dto.serial_passport && dto.number_passport) {
      const student = await this.prisma.student.findFirst({
        where: {
          passportDocumentSeries: dto.serial_passport,
          passportDocumentNumbers: dto.number_passport,
          userId: { equals: null } // ✅ виправлено з null
        }
      })
      if (student) return student
    }

    // Жодного документа не вказано або нічого не знайдено
    throw new BadRequestException(
      'Необхідно вказати хоча б один ідентифікаційний документ для верифікації.'
    )
  }

  /**
   * Terminates the user's session.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @returns A promise that resolves after the session is terminated.
   * @throws InternalServerErrorException if there was a problem terminating the session.
   */
  public async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              'Не вдалося завершити сесію. Спробуйте ще раз.'
            )
          )
        }
        res.clearCookie(this.configService.getOrThrow('SESSION_NAME'))
        resolve()
      })
    })
  }

  /**
   * Saves the user's session.
   * @param req - The Express request object.
   * @param user - The user object.
   * @returns A promise that resolves with the user after saving the session.
   * @throws InternalServerErrorException if there was a problem saving the session.
   */
  public async saveSession(req: Request, user: User): Promise<{ user: UserEntity }> {
    return new Promise<{ user: UserEntity }>((resolve, reject) => {
      req.session.userId = user.id

      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err)
          return reject(
            new InternalServerErrorException(
              'Не вдалося зберегти сесію. Будь ласка, перевірте налаштування сесії.'
            )
          )
        }
        resolve({ user: new UserEntity(user) })
      })
    })
  }
}