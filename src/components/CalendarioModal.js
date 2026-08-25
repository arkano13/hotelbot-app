import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";

const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function mismasFechas(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function generarDiasDelMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const dias = [];

  // Espacios vacíos antes del día 1, para alinear con el día de la semana
  for (let i = 0; i < primerDia.getDay(); i++) {
    dias.push(null);
  }
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    dias.push(new Date(anio, mes, d));
  }

  return dias;
}

// Modal con un calendario simple de un mes, con flechas para cambiar de
// mes. No permite elegir fechas pasadas (antes de hoy).
//
// `fechaHoyServidor` (opcional, formato "YYYY-MM-DD"): si se pasa, se usa
// esa fecha como "hoy" en vez de la del reloj del dispositivo — así,
// aunque el tablet tenga mal la fecha o la zona horaria, el calendario
// bloquea los días correctos según el servidor.
export default function CalendarioModal({ visible, fechaSeleccionada, fechaHoyServidor, onSeleccionar, onCerrar }) {
  const hoy = fechaHoyServidor
    ? new Date(`${fechaHoyServidor}T00:00:00`)
    : new Date();
  hoy.setHours(0, 0, 0, 0);

  // Resguardo: si la fecha seleccionada llega inválida por cualquier
  // motivo, se ignora en vez de dejar que el calendario truene.
  const fechaSeleccionadaValida =
    fechaSeleccionada instanceof Date && !Number.isNaN(fechaSeleccionada.getTime())
      ? fechaSeleccionada
      : null;

  const [mesVisible, setMesVisible] = useState(
    new Date(fechaSeleccionadaValida?.getFullYear() ?? hoy.getFullYear(), fechaSeleccionadaValida?.getMonth() ?? hoy.getMonth(), 1)
  );

  const dias = generarDiasDelMes(mesVisible.getFullYear(), mesVisible.getMonth());

  function cambiarMes(delta) {
    setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + delta, 1));
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.fondo}>
        <View style={styles.caja}>
          <View style={styles.filaEncabezado}>
            <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.flecha}>
              <Text style={styles.flechaTexto}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.tituloMes}>
              {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.flecha}>
              <Text style={styles.flechaTexto}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filaDiasSemana}>
            {DIAS_SEMANA.map((d, i) => (
              <Text key={i} style={styles.diaSemanaTexto}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {dias.map((fecha, i) => {
              if (!fecha) {
                return <View key={i} style={styles.celda} />;
              }

              const esPasado = fecha < hoy;
              const esHoy = mismasFechas(fecha, hoy);
              const esSeleccionado = fechaSeleccionadaValida && mismasFechas(fecha, fechaSeleccionadaValida);

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.celda,
                    esSeleccionado && styles.celdaSeleccionada,
                    esHoy && !esSeleccionado && styles.celdaHoy,
                  ]}
                  disabled={esPasado}
                  onPress={() => onSeleccionar(fecha)}
                >
                  <Text
                    style={[
                      styles.diaTexto,
                      esPasado && styles.diaPasadoTexto,
                      esSeleccionado && styles.diaSeleccionadoTexto,
                    ]}
                  >
                    {fecha.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.botonCerrar} onPress={onCerrar}>
            <Text style={styles.botonCerrarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  caja: { backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  filaEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  flecha: { padding: 8 },
  flechaTexto: { fontSize: 22, color: "#2563eb", fontWeight: "700" },
  tituloMes: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  filaDiasSemana: { flexDirection: "row", marginBottom: 4 },
  diaSemanaTexto: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  celda: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  celdaSeleccionada: { backgroundColor: "#2563eb", borderRadius: 8 },
  celdaHoy: { borderWidth: 1, borderColor: "#2563eb", borderRadius: 8 },
  diaTexto: { fontSize: 14, color: "#1e293b" },
  diaPasadoTexto: { color: "#cbd5e1" },
  diaSeleccionadoTexto: { color: "#fff", fontWeight: "700" },
  botonCerrar: { marginTop: 12, alignItems: "center", padding: 10 },
  botonCerrarTexto: { color: "#94a3b8", fontWeight: "600" },
});