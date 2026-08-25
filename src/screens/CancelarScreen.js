import { View, Text, StyleSheet } from "react-native";
import ListaAccion from "../components/ListaAccion";
import { api } from "../api/client";

export default function CancelarScreen() {
  return (
    <ListaAccion
      obtenerLista={api.obtenerReservasParaCancelar}
      obtenerIdAccion={(reserva) => reserva.id}
      alConfirmar={(reserva) => api.cancelarReserva(reserva.id)}
      textoBoton="Cancelar reserva"
      colorBoton="#dc2626"
      textoVacio="No hay reservas confirmadas para cancelar."
      tituloConfirmacion="¿Cancelar esta reserva?"
      renderInfo={(reserva) => (
        <View>
          <Text style={styles.habitacion}>Hab. {reserva.habitacion.numero}</Text>
          <Text style={styles.cliente}>{reserva.cliente.nombre}</Text>
          <Text style={styles.detalle}>Código: {reserva.codigo}</Text>
          <Text style={styles.detalle}>
            Total: L. {Number(reserva.precioTotal).toFixed(2)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  habitacion: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  cliente: { fontSize: 15, color: "#334155", marginTop: 2 },
  detalle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
});