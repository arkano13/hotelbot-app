import { Component } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

// Si cualquier pantalla de la app truena por un error inesperado, esto
// evita que la app entera se cierre — en vez de eso, muestra un aviso
// con un botón para reintentar. Envuelve toda la app en App.js.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { tieneError: false };
  }

  static getDerivedStateFromError() {
    return { tieneError: true };
  }

  componentDidCatch(error, info) {
    console.log("❌ Error capturado por ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.tieneError) {
      return (
        <View style={styles.contenedor}>
          <Text style={styles.titulo}>Algo salió mal</Text>
          <Text style={styles.texto}>
            Hubo un problema inesperado en la app. Toca el botón para volver a intentar.
          </Text>
          <TouchableOpacity
            style={styles.boton}
            onPress={() => this.setState({ tieneError: false })}
          >
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f8fafc",
  },
  titulo: { fontSize: 20, fontWeight: "700", color: "#1e293b", marginBottom: 10 },
  texto: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 24 },
  boton: { backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8 },
  botonTexto: { color: "#fff", fontWeight: "700" },
});