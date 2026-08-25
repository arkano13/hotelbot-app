import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./client";

// Mientras la app está abierta, muestra la notificación igual como si
// llegara con la app cerrada (con sonido y todo).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function obtenerTokenPush() {
  if (!Device.isDevice) {
    // Los simuladores/emuladores no pueden recibir push de verdad.
    console.log("Las notificaciones push solo funcionan en un celular real.");
    return null;
  }

  const permisoActual = await Notifications.getPermissionsAsync();
  let estado = permisoActual.status;

  if (estado !== "granted") {
    const solicitado = await Notifications.requestPermissionsAsync();
    estado = solicitado.status;
  }

  if (estado !== "granted") {
    console.log("Permiso de notificaciones no concedido.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // El projectId lo genera Expo cuando corres `eas init` o el proyecto ya
  // tiene EAS configurado. Si todavía no lo has hecho, esto puede fallar
  // silenciosamente — está bien, la app funciona igual, solo sin push.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const resultado = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return resultado.data;
  } catch (error) {
    console.log("No se pudo obtener el token de push:", error.message);
    return null;
  }
}

// Hook: se usa una sola vez, arriba en App.js. Pide permiso, obtiene el
// token, y lo manda al backend para que quede registrado.
export function useRegistrarNotificacionesPush() {
  useEffect(() => {
    (async () => {
      const token = await obtenerTokenPush();
      if (!token) return;

      try {
        await api.registrarDispositivoPush(token);
      } catch (error) {
        console.log("No se pudo registrar el dispositivo para push:", error.message);
      }
    })();
  }, []);
}