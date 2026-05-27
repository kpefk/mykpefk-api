import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// ── Типи відповідей ЄДЕБО ──────────────────────────────────────────

interface EdboTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface EdboErrorResponse {
  errorCode: number | null;
  errorMessage: string;
  errorDetails?: string;
  paramsValidationErrors?: Array<{
    errorMessage: string;
    propertyName: string;
    jsonProperty: string;
  }>;
}

// ── Сервіс ────────────────────────────────────────────────────────

@Injectable()
export class EdboService {
  private readonly logger = new Logger(EdboService.name);

  private readonly baseUrl = process.env.EDBO_BASE_URL!;
  private readonly appKey = process.env.EDBO_APP_KEY!;
  private readonly userLogin = process.env.EDBO_USER_LOGIN!;
  private readonly userPassword = process.env.EDBO_USER_PASSWORD!;

  // ── Кеш токена ──────────────────────────────────────────────────

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // ── Авторизація ─────────────────────────────────────────────────

  /**
   * Повертає Bearer-токен. Використовує кешований токен до закінчення
   * його терміну дії (з буфером 60 секунд).
   *
   * `POST /oauth/token`
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const tokenData = await this.fetchToken();
    // expires_in повертається в секундах; зберігаємо з буфером 60 с
    this.cachedToken = tokenData.access_token;
    this.tokenExpiresAt = now + (tokenData.expires_in - 60) * 1000;

    return this.cachedToken;
  }

  private async fetchToken(): Promise<EdboTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'password',
      username: this.userLogin,
      password: this.userPassword,
      app_key: this.appKey,
    }).toString()

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      body,
    })

    // ✅ Читаємо як текст — не падає на HTML
    const text = await response.text()

    // Діагностичний лог — видали після вирішення проблеми
    this.logger.debug(`ЄДЕБО /oauth/token [${response.status}]: ${text.slice(0, 300)}`)

    if (!response.ok) {
      this.logger.error(`ЄДЕБО auth failed [${response.status}]:`, text.slice(0, 300))
      throw new HttpException(
        'ЄДЕБО authentication failed',
        response.status,
      )
    }

    return this.parseJson(text, '/oauth/token') as EdboTokenResponse
  }

  /**
   * Примусово скидає кешований токен (наприклад після отримання 401).
   */
  invalidateToken(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  // ── Базовий HTTP-метод ──────────────────────────────────────────

  /**
   * Виконує авторизований POST-запит до ЄДЕБО API.
   * При отриманні 401 — інвалідує токен і повторює запит один раз.
   *
   * @param path - Шлях починаючи з `/api/`, наприклад `/api/studentEducations/add`
   * @param body - Тіло запиту (буде серіалізовано в JSON)
   */

  private static readonly DENIED_MESSAGE = 'Authorization has been denied for this request.';

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.doPost<T>(path, body, false);
  }

  private async doPost<T>(
    path: string,
    body: unknown,
    isRetry: boolean,
  ): Promise<T> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    // ✅ Спочатку читаємо як текст — не падає на HTML
    const text = await response.text()

    // Тимчасовий лог для діагностики — прибери після вирішення проблеми
    if (!response.ok || text.trimStart().startsWith('<')) {
      this.logger.warn(
        `ЄДЕБО raw response [${response.status}] ${path}: ${text.slice(0, 300)}`
      )
    }

    // ✅ Обробляємо порожню відповідь (204 No Content)
    const data: unknown = text.length > 0 ? this.parseJson(text, path) : null

    // ── Розпізнавання протухлого токена ─────────────────────────────
    const isTokenExpired =
      response.status === HttpStatus.UNAUTHORIZED ||
      (data as any)?.message === EdboService.DENIED_MESSAGE

    if (isTokenExpired && !isRetry) {
      this.logger.warn('ЄДЕБО токен протух — оновлення і повтор запиту')
      this.invalidateToken()
      return this.doPost<T>(path, body, true)
    }

    if (!response.ok) {
      const errorBody = data as EdboErrorResponse
      this.logger.error(
        `ЄДЕБО API error ${response.status} on ${path}`,
        JSON.stringify(errorBody),
      )
      throw new HttpException(errorBody, response.status)
    }

    return data as T
  }

  /**
   * Безпечний JSON.parse з інформативною помилкою.
   */
  private parseJson(text: string, path: string): unknown {
    try {
      return JSON.parse(text)
    } catch {
      this.logger.error(
        `ЄДЕБО повернув не-JSON для ${path}: ${text.slice(0, 200)}`
      )
      throw new HttpException(
        `ЄДЕБО API повернув невалідний JSON для ${path}`,
        HttpStatus.BAD_GATEWAY,
      )
    }
  }
}