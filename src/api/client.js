export const API_URL = "https://hotelbot-production-1991.up.railway.app";
export const API_KEY = "d59900e526063490a7247a56106895cdb11c5b434fac077d75c8e2cacbc4b090";

async function llamarApi(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(opciones.headers || {}),
    },
  });

  let cuerpo;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok || !cuerpo?.success) {
    throw new Error(cuerpo?.message || "Error de conexión con el servidor");
  }

  return cuerpo.data;
}

export const api = {
  // Dashboard
  obtenerHabitaciones: () => llamarApi("/api/admin/habitaciones"),
  editarHabitacion: (habitacionId, { numero, capacidad }) =>
    llamarApi(`/api/admin/habitaciones/${habitacionId}/editar`, {
      method: "POST",
      body: JSON.stringify({ numero, capacidad }),
    }),
  editarReserva: (reservaId, { nombreCliente, cantidadNoches, horas, precioPorNoche }) =>
    llamarApi(`/api/admin/reservas/${reservaId}/editar`, {
      method: "POST",
      body: JSON.stringify({ nombreCliente, cantidadNoches, horas, precioPorNoche }),
    }),
  obtenerTodasLasReservas: () => llamarApi("/api/admin/reservas/todas"),

  // Check-in
  obtenerReservasParaCheckIn: () => llamarApi("/api/admin/reservas/checkin"),
  hacerCheckIn: (habitacionId, metodoPago, nuevaHabitacionId) =>
    llamarApi(`/api/admin/checkin/${habitacionId}`, {
      method: "POST",
      body: JSON.stringify({ metodoPago, nuevaHabitacionId }),
    }),
  obtenerAlternativasCheckIn: (habitacionId) =>
    llamarApi(`/api/admin/checkin/${habitacionId}/alternativas`),

  // Checkout
  obtenerReservasParaCheckout: () => llamarApi("/api/admin/reservas/checkout"),
  hacerCheckout: (habitacionId) =>
    llamarApi(`/api/admin/checkout/${habitacionId}`, { method: "POST" }),

  // Cancelar
  obtenerReservasParaCancelar: () => llamarApi("/api/admin/reservas/cancelar"),
  cancelarReserva: (reservaId) =>
    llamarApi(`/api/admin/cancelar/${reservaId}`, { method: "POST" }),

  // Mantenimiento
  obtenerHabitacionesMantenimiento: () => llamarApi("/api/admin/mantenimiento"),
  alternarMantenimiento: (habitacionId) =>
    llamarApi(`/api/admin/mantenimiento/${habitacionId}`, { method: "POST" }),

  // Pagos
  obtenerPagosPendientes: () => llamarApi("/api/admin/pagos-pendientes"),
  aprobarPago: (codigo) =>
    llamarApi(`/api/admin/pagos/${codigo}/aprobar`, { method: "POST" }),
  rechazarPago: (codigo, motivo) =>
    llamarApi(`/api/admin/pagos/${codigo}/rechazar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    }),

  // Walk-in
  obtenerHabitacionesDisponiblesWalkIn: ({ fechaEntrada, fechaSalida, personas }) =>
    llamarApi(
      `/api/admin/walkin/disponibles?fechaEntrada=${fechaEntrada}&fechaSalida=${fechaSalida}&personas=${personas}`
    ),
  buscarHabitacionesPorCapacidad: ({ fechaEntrada, fechaSalida, personas }) =>
    llamarApi(
      `/api/admin/walkin/habitaciones?fechaEntrada=${fechaEntrada}&fechaSalida=${fechaSalida}${
        personas ? `&personas=${personas}` : ""
      }`
    ),
  crearWalkIn: (datos) =>
    llamarApi("/api/admin/walkin", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  // Interruptor global del bot
  obtenerEstadoBot: () => llamarApi("/api/admin/bot-estado"),
  cambiarEstadoBot: (activo) =>
    llamarApi("/api/admin/bot-estado", {
      method: "POST",
      body: JSON.stringify({ activo }),
    }),

  // Escalar a humano
  obtenerEscalaciones: () => llamarApi("/api/admin/escalaciones"),
  aceptarEscalacion: (conversationId) =>
    llamarApi(`/api/admin/escalaciones/${conversationId}/aceptar`, {
      method: "POST",
    }),
  rechazarEscalacion: (conversationId) =>
    llamarApi(`/api/admin/escalaciones/${conversationId}/rechazar`, {
      method: "POST",
    }),
  obtenerConversacionesEnModoHumano: () =>
    llamarApi("/api/admin/conversaciones-humano"),
  devolverABot: (conversationId) =>
    llamarApi(`/api/admin/conversaciones-humano/${conversationId}/devolver-a-bot`, {
      method: "POST",
    }),

  // Notificaciones push
  registrarDispositivoPush: (token) =>
    llamarApi("/api/admin/dispositivos", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  // Aprobación de habitación más grande
  obtenerReservasQueRequierenAprobacion: () =>
    llamarApi("/api/admin/reservas-requieren-aprobacion"),
  aprobarHabitacion: (reservaId) =>
    llamarApi(`/api/admin/reservas-requieren-aprobacion/${reservaId}/aprobar`, {
      method: "POST",
    }),
  rechazarHabitacion: (reservaId) =>
    llamarApi(`/api/admin/reservas-requieren-aprobacion/${reservaId}/rechazar`, {
      method: "POST",
    }),

  // Fecha real del servidor (Honduras), para no depender del reloj del tablet
  obtenerFechaActual: () => llamarApi("/api/admin/fecha-actual"),

  // Mover una reserva activa a otra habitación
  obtenerReservasActivasParaMover: () => llamarApi("/api/admin/mover-habitacion/reservas"),
  obtenerHabitacionesLibresParaMover: (reservaId) =>
    llamarApi(`/api/admin/mover-habitacion/${reservaId}/habitaciones-libres`),
  moverHabitacion: (reservaId, nuevaHabitacionId) =>
    llamarApi(`/api/admin/mover-habitacion/${reservaId}`, {
      method: "POST",
      body: JSON.stringify({ nuevaHabitacionId }),
    }),
};
