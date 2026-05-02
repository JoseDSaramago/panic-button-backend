import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User.entity';
import { EmergencyContact } from '../../entities/EmergencyContact.entity';
import { PanicEvent } from '../../entities/PanicEvent.entity';
import { sendWhatsAppMessage, sendSmsMessage, BrevoSendResult } from '../../services/brevo.service';
import { buildMapsUrl } from '../../utils/maps';
import { logger } from '../../utils/logger';
import { TriggerPanicDto } from './panic.schema';

export interface PanicDetail {
  contact_id: string;
  alias: string;
  whatsapp_number: string;
  whatsapp: { success: boolean; message_id?: string; error?: string };
  sms: { success: boolean; message_id?: string; error?: string };
}

export interface TriggerPanicResult {
  success: boolean;
  event_id: string;
  triggered_at: Date;
  maps_url: string | null;
  notified: number;
  failed: number;
  details: PanicDetail[];
}

/**
 * Dispara el botón de pánico para el usuario indicado.
 * 1. Carga usuario + contactos activos
 * 2. Construye URL de Google Maps
 * 3. Envía WhatsApp a todos los contactos en paralelo
 * 4. Registra el PanicEvent (solo INSERT, nunca UPDATE/DELETE)
 */
export async function triggerPanic(
  userId: string,
  dto: TriggerPanicDto,
  isTest = false
): Promise<TriggerPanicResult> {
  const userRepo = AppDataSource.getRepository(User);
  const contactRepo = AppDataSource.getRepository(EmergencyContact);
  const eventRepo = AppDataSource.getRepository(PanicEvent);

  // Cargar usuario
  const user = await userRepo.findOne({ where: { user_uuid: userId } });
  if (!user) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  if (!user.panic_enabled && !isTest) {
    const err = new Error('El botón de pánico está desactivado para este usuario') as Error & {
      statusCode: number;
    };
    err.statusCode = 403;
    throw err;
  }

  // Contactos activos ordenados por notify_order
  const contacts = await contactRepo.find({
    where: { user_uuid: userId, is_active: true },
    order: { notify_order: 'ASC' },
  });

  const mapsUrl = buildMapsUrl(dto.lat, dto.lng);
  const triggeredAt = new Date();
  const effectiveAlias = isTest ? `[TEST] ${user.alias}` : user.alias;
  const effectiveMapsUrl = mapsUrl ?? 'https://maps.google.com'; // fallback si no hay GPS

  // Enviar WhatsApp + SMS en paralelo por cada contacto
  const sendPromises = contacts.map(async (contact): Promise<PanicDetail> => {
    const [whatsappResult, smsResult] = await Promise.all([
      sendWhatsAppMessage(contact.whatsapp_number, effectiveAlias, effectiveMapsUrl, false),
      sendSmsMessage(contact.whatsapp_number, effectiveAlias, effectiveMapsUrl, false),
    ]);

    return {
      contact_id: contact.contact_uuid,
      alias: contact.alias,
      whatsapp_number: contact.whatsapp_number,
      whatsapp: {
        success: whatsappResult.success,
        message_id: whatsappResult.message_id,
        error: whatsappResult.error,
      },
      sms: {
        success: smsResult.success,
        message_id: smsResult.message_id,
        error: smsResult.error,
      },
    };
  });

  const settled = await Promise.allSettled(sendPromises);

  const details: PanicDetail[] = settled.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    // Promise rechazada inesperada
    return {
      contact_id: 'unknown',
      alias: 'unknown',
      whatsapp_number: 'unknown',
      whatsapp: { success: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
      sms: { success: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
    };
  });

  // Contacto entregado si al menos WhatsApp o SMS tuvo éxito
  const delivered = details.filter((d) => d.whatsapp.success || d.sms.success);
  const failed = details.filter((d) => !d.whatsapp.success && !d.sms.success);

  // Actualizar last_notified_at en los contactos que recibieron al menos un mensaje
  if (delivered.length > 0) {
    const deliveredIds = delivered
      .filter((d) => d.contact_id !== 'unknown')
      .map((d) => d.contact_id);

    if (deliveredIds.length > 0) {
      await contactRepo
        .createQueryBuilder()
        .update(EmergencyContact)
        .set({ last_notified_at: triggeredAt })
        .where('contact_uuid IN (:...ids)', { ids: deliveredIds })
        .execute();
    }
  }

  // Registrar el evento de pánico (SOLO INSERT)
  const brevoMessageIds = details
    .filter((d) => d.whatsapp.message_id || d.sms.message_id)
    .map((d) => ({
      contact_id: d.contact_id,
      whatsapp_message_id: d.whatsapp.message_id,
      sms_message_id: d.sms.message_id,
    }));

  const errorDetail =
    failed.length > 0
      ? failed.map((f) => `${f.whatsapp_number}: WA=${f.whatsapp.error} SMS=${f.sms.error}`).join(' | ')
      : null;

  const event = eventRepo.create({
    user_uuid: userId,
    triggered_at: triggeredAt,
    latitude: dto.lat ?? null,
    longitude: dto.lng ?? null,
    maps_url: mapsUrl,
    contacts_attempted: contacts.length,
    contacts_delivered: delivered.length,
    brevo_message_ids: brevoMessageIds.length > 0 ? brevoMessageIds : null,
    error_detail: errorDetail,
    device_os: dto.device_os ?? null,
  });

  const savedEvent = await eventRepo.save(event);

  logger.info('Panic triggered', {
    userId,
    eventId: savedEvent.event_uuid,
    attempted: contacts.length,
    delivered: delivered.length,
    failed: failed.length,
    isTest,
  });

  return {
    success: true,
    event_id: savedEvent.event_uuid,
    triggered_at: triggeredAt,
    maps_url: mapsUrl,
    notified: delivered.length,
    failed: failed.length,
    details,
  };
}

export interface PanicHistoryItem {
  event_uuid: string;
  triggered_at: Date;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  contacts_attempted: number;
  contacts_delivered: number;
  contacts_failed: number;
  device_os: string | null;
  error_detail: string | null;
}

export interface PanicHistoryResult {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  events: PanicHistoryItem[];
}

export async function getPanicHistory(
  userId: string,
  page = 1,
  limit = 10
): Promise<PanicHistoryResult> {
  const repo = AppDataSource.getRepository(PanicEvent);

  const [rows, total] = await repo.findAndCount({
    where: { user_uuid: userId },
    order: { triggered_at: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const events: PanicHistoryItem[] = rows.map((e) => ({
    event_uuid: e.event_uuid,
    triggered_at: e.triggered_at,
    maps_url: e.maps_url,
    latitude: e.latitude,
    longitude: e.longitude,
    contacts_attempted: e.contacts_attempted,
    contacts_delivered: e.contacts_delivered,
    contacts_failed: e.contacts_attempted - e.contacts_delivered,
    device_os: e.device_os,
    error_detail: e.error_detail,
  }));

  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    events,
  };
}
