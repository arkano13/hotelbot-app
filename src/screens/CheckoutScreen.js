import { View, Text, StyleSheet } from "react-native";
import ListaAccion from "../components/ListaAccion";
import { api } from "../api/client";
import { esEstadiaPorHoras, textoHorario } from "../utils/estadia";

export default function CheckoutScreen() {
  return (
    <ListaAccion
      obtenerLista={api.obtenerReservasParaCheckout}
      obtenerIdAccion={(reserva) => reserva.habitacionId}
      alConfirmar={(reserva) => api.hacerCheckout(reserva.habitacionId)}
      textoBoton="Hacer checkout"
      colorBoton="#ea580c"
      textoVacio="No hay habitaciones ocupadas para hacer checkout."
      tituloConfirmacion="¿Registrar checkout?"
      renderInfo={(reserva) => (
        <View>
          <Text style={styles.habitacion}>Hab. {reserva.habitacion.numero}</Text>
          <Text style={styles.cliente}>{reserva.cliente.nombre}</Text>
          <Text style={styles.detalle}>Código: {reserva.codigo}</Text>
          {esEstadiaPorHoras(reserva) && (
            <Text style={styles.horario}>⏱ {textoHorario(reserva)}</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  habitacion: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  cliente: { fontSize: 15, color: "#334155", marginTop: 2 },
  detalle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  horario: { fontSize: 13, color: "#b45309", fontWeight: "700", marginTop: 4 },
});