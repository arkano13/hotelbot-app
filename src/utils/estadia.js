// Utilidades para las estadías por horas ("3_HORAS"): en esas reservas lo
// importante para recepción es la hora exacta de entrada y de salida, no
// solo el día.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Una reserva es por horas si el backend lo dice con `tipoEstadia`, o —
// cuando ese campo no viene en la respuesta — si entrada y salida están a
// menos de un día de diferencia.
export function esEstadiaPorHoras(reserva) {
  if (!reserva) return false;
  if (reserva.tipoEstadia) return reserva.tipoEstadia === "3_HORAS";
  if (!reserva.fechaEntrada || !reserva.fechaSalida) return false;
  const duracion = new Date(reserva.fechaSalida) - new Date(reserva.fechaEntrada);
  return duracion > 0 && duracion < MS_POR_DIA;
}

export function formatearHora(fechaISO) {
  if (!fechaISO) return "";
  return new Date(fechaISO).toLocaleTimeString("es-HN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Texto corto tipo "Entra 2:15 p. m. → Sale 5:15 p. m." para estadías por
// horas. Si falta la hora de entrada, muestra solo la de salida.
export function textoHorario(reserva) {
  const salida = formatearHora(reserva.fechaSalida);
  if (!reserva.fechaEntrada) return `Sale a las ${salida}`;
  return `Entra ${formatearHora(reserva.fechaEntrada)} → Sale ${salida}`;
}
