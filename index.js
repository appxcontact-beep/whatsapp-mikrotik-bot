import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import axios from "axios"
import express from "express"

const app = express()
app.use(express.json())

const plans = {
  "1": { name: "30 minutos", price: 5 },
  "2": { name: "2 horas", price: 10 }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["Chrome", "Ubuntu", "22.04"]
  })

  sock.ev.on("creds.update", saveCreds)

  // 🔑 ESPERAR A QUE LA CONEXIÓN ESTÉ LISTA
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open" && !state.creds.registered) {
      const phoneNumber = process.env.BOT_NUMBER
      const code = await sock.requestPairingCode(phoneNumber)
      console.log("📲 CÓDIGO DE VINCULACIÓN:", code)
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation?.toLowerCase()

    if (text === "menu") {
      await sock.sendMessage(from, {
        text: `📶 PLANES
1️⃣ 30 min - $5
2️⃣ 2 horas - $10

Responde con el número`
      })
    }

    if (plans[text]) {
      const plan = plans[text]

      const mp = await axios.post(
        "https://api.mercadopago.com/checkout/preferences",
        {
          items: [{
            title: plan.name,
            quantity: 1,
            unit_price: plan.price
          }]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      )

      await sock.sendMessage(from, {
        text: `💳 PAGA AQUÍ:\n${mp.data.init_point}`
      })
    }
  })
}

startBot()

app.get("/", (req, res) => res.send("Bot activo"))
app.listen(3000)
