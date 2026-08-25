import { ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";

const OPCIONES = [
  { ruta: "CheckIn", titulo: "Entrada", descripcion: "Reservas que llegan hoy", color: "#2563eb" },
  { ruta: "Checkout", titulo: "Salida", descripcion: "Registrar la salida de un huésped", color: "#ea580c" },
  { ruta: "Cancelar", titulo: "Cancelar reserva", descripcion: "Cancelar una reserva confirmada", color: "#dc2626" },
  { ruta: "Mantenimiento", titulo: "Mantenimiento", descripcion: "Activar o desactivar habitaciones", color: "#6b7280" },
  { ruta: "OcuparHabitacion", titulo: "Ocupar habitación", descripcion: "El huésped ya está aquí — ocupa y cobra de una vez", color: "#dc2626" },
  { ruta: "Reservar", titulo: "Reservar", descripcion: "Apartar una habitación para hoy o después, con o sin pagar todavía", color: "#0891b2" },
  { ruta: "TodasReservas", titulo: "Reservaciones", descripcion: "Ver huéspedes que todavía esperan entrada", color: "#0f766e" },
];

export default function MenuScreen({ navigation }) {
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      {OPCIONES.map((op) => (
        <TouchableOpacity
          key={op.ruta}
          style={[styles.tarjeta, { borderLeftColor: op.color }]}
          onPress={() => navigation.navigate(op.ruta)}
        >
          <Text style={styles.titulo}>{op.titulo}</Text>
          <Text style={styles.descripcion}>{op.descripcion}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  contenido: { padding: 16, paddingBottom: 40 },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  titulo: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  descripcion: { fontSize: 13, color: "#64748b", marginTop: 3 },
});
