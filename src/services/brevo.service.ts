import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const BREVO_WHATSAPP_URL = 'https://api.brevo.com/v3/whatsapp/sendMessage';
const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

export interface BrevoSendResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

/**
 * Envía un mensaje de WhatsApp a través de la API de Brevo.
 *
 * @param whatsappNumber  Número del destinatario con código de país (+521XXXXXXXXXX)
 * @param userAlias       Nombre del usuario que activó el botón de pánico ({{1}})
 * @param mapsUrl         URL de Google Maps con la ubicación ({{2}})
 * @param isTest          Si es true, antepone [TEST] al alias para mensajes de prueba
 */
/**
 * Envía un SMS transaccional a través de la API de Brevo.
 *
 * @param phoneNumber  Número del destinatario con código de país (521XXXXXXXXXX)
 * @param userAlias    Nombre del usuario que activó el botón de pánico
 * @param mapsUrl      URL de Google Maps con la ubicación
 * @param isTest       Si es true, antepone [TEST] al alias
 */
export async function sendSmsMessage(
  phoneNumber: string,
  userAlias: string,
  mapsUrl: string,
  isTest = false
): Promise<BrevoSendResult> {
  const displayAlias = isTest ? `[TEST] ${userAlias}` : userAlias;

  const content = `ALERTA PANICO: ${displayAlias} necesita ayuda. Ubicacion: ${mapsUrl}`;

  const payload = {
    type: 'transactional',
    unicodeEnabled: false,
    sender: env.BREVO_SMS_SENDER,
    recipient: phoneNumber,
    content,
  };

  try {
    const response = await axios.post(BREVO_SMS_URL, payload, {
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });

    const messageId: string = response.data?.messageId ?? 'unknown';

    logger.info('Brevo SMS sent', {
      to: phoneNumber,
      message_id: messageId,
      is_test: isTest,
    });

    return { success: true, message_id: messageId };
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>;

    const status = axiosErr.response?.status;
    const apiMessage = axiosErr.response?.data?.message ?? axiosErr.message;

    let errorDescription: string;
    if (status === 401) {
      errorDescription = 'API key de Brevo incorrecta o expirada';
    } else if (status === 400) {
      errorDescription = `Número de SMS inválido o parámetros incorrectos: ${apiMessage}`;
    } else if (status === 429) {
      errorDescription = 'Límite de mensajes de Brevo excedido';
    } else {
      errorDescription = `Error Brevo SMS (${status ?? 'network'}): ${apiMessage}`;
    }

    logger.error('Brevo SMS send failed', {
      to: phoneNumber,
      status,
      error: errorDescription,
    });

    return { success: false, error: errorDescription };
  }
}

export async function sendWhatsAppMessage(
  whatsappNumber: string, 
  userAlias: string,
  mapsUrl: string,
  isTest = false
): Promise<BrevoSendResult> {
  const displayAlias = isTest ? `[TEST] ${userAlias}` : userAlias;

  const payload = {
    type: 'whatsapp',
    messages: [
      {
        sender: { phone: env.BREVO_SENDER_NUMBER },
        receivers: [{ phone: whatsappNumber }],
        template: {
          name: env.BREVO_WHATSAPP_TEMPLATE,
          language: 'es_MX',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: displayAlias },
                { type: 'text', text: mapsUrl },
              ],
            },
          ],
        },
      },
    ],
  };

  try {
    const response = await axios.post(BREVO_WHATSAPP_URL, payload, {
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10_000, // 10 segundos
    });

    // Brevo devuelve { messageId } o similar según la versión de la API
    const messageId: string =
      response.data?.messages?.[0]?.id ?? response.data?.messageId ?? 'unknown';

    logger.info('Brevo WhatsApp message sent', {
      to: whatsappNumber,
      message_id: messageId,
      is_test: isTest,
    });

    return { success: true, message_id: messageId };
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string; code?: string }>;

    const status = axiosErr.response?.status;
    const apiMessage = axiosErr.response?.data?.message ?? axiosErr.message;

    // Clasificar errores comunes de la API
    let errorDescription: string;
    if (status === 401) {
      errorDescription = 'API key de Brevo incorrecta o expirada';
    } else if (status === 400) {
      errorDescription = `Número de WhatsApp inválido o parámetros incorrectos: ${apiMessage}`;
    } else if (status === 429) {
      errorDescription = 'Límite de mensajes de Brevo excedido';
    } else {
      errorDescription = `Error Brevo (${status ?? 'network'}): ${apiMessage}`;
    }

    logger.error('Brevo WhatsApp send failed', {
      to: whatsappNumber,
      status,
      error: errorDescription,
    });

    return { success: false, error: errorDescription };
  }
}
