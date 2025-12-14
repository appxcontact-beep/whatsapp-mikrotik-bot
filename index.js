import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import express from "express"

const app = express()

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["Chrome", "Ubuntu", "22.04"],
    printQRInTerminal: false, // 🔴 QR OFF DE VERDAD
  })

  sock.ev.on("creds.update", saveCreds)

  // 🔑 PEDIR PAIRING CODE INMEDIATAMENTE
  if (!state.creds.registered) {
    const phoneNumber = process.env.BOT_NUMBER
    const code = await sock.requestPairingCode(phoneNumber)
    console.log("📲 CÓDIGO DE VINCULACIÓN:", code)
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconectando limpio…")
        startBot()
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp conectado correctamente")
    }
  })
}

startBot()

app.get("/", (_, res) => res.send("Bot activo"))
app.listen(3000)


