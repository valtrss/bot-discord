const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

// ---- Variables de entorno (se configuran en Railway, nunca acá en el código) ----
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const PTERODACTYL_URL = process.env.PTERODACTYL_URL; // ej: https://mcpanel.gamehost.cl
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY;
const SERVER_ID = process.env.SERVER_ID; // ej: c7fa539d

if (!DISCORD_TOKEN || !CLIENT_ID || !PTERODACTYL_URL || !PTERODACTYL_API_KEY || !SERVER_ID) {
  console.error(
    "Faltan variables de entorno. Revisa DISCORD_TOKEN, DISCORD_CLIENT_ID, PTERODACTYL_URL, PTERODACTYL_API_KEY y SERVER_ID."
  );
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ---- Definición de los comandos slash ----
const commands = [
  new SlashCommandBuilder().setName("encender").setDescription("Enciende el servidor de Minecraft"),
  new SlashCommandBuilder().setName("apagar").setDescription("Apaga el servidor de Minecraft"),
  new SlashCommandBuilder().setName("reiniciar").setDescription("Reinicia el servidor de Minecraft"),
  new SlashCommandBuilder().setName("estado").setDescription("Muestra el estado actual del servidor"),
].map((cmd) => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Comandos slash registrados.");
}

// ---- Helper: llamar a la API de Pterodactyl (Client API) ----
async function pteroFetch(path, options = {}) {
  const res = await fetch(`${PTERODACTYL_URL}/api/client${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PTERODACTYL_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pterodactyl API error ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function sendPowerAction(signal) {
  // signal: "start" | "stop" | "restart" | "kill"
  return pteroFetch(`/servers/${SERVER_ID}/power`, {
    method: "POST",
    body: JSON.stringify({ signal }),
  });
}

async function getServerStatus() {
  const data = await pteroFetch(`/servers/${SERVER_ID}/resources`);
  return data.attributes; // { current_state, resources: { memory_bytes, cpu_absolute, ... } }
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / 1024 / 1024;
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

const stateLabels = {
  running: "🟢 Encendido",
  starting: "🟡 Iniciando...",
  stopping: "🟠 Apagando...",
  offline: "🔴 Apagado",
};

// ---- Manejo de comandos ----
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === "encender") {
      await interaction.deferReply();
      const status = await getServerStatus();
      if (status.current_state === "running" || status.current_state === "starting") {
        await interaction.editReply("⚠️ El servidor ya está encendido o iniciando.");
        return;
      }
      await sendPowerAction("start");
      await interaction.editReply("🟢 Encendiendo el servidor... puede tardar 1-2 minutos en estar listo.");
    }

    if (commandName === "apagar") {
      await interaction.deferReply();
      const status = await getServerStatus();
      if (status.current_state === "offline") {
        await interaction.editReply("⚠️ El servidor ya está apagado.");
        return;
      }
      await sendPowerAction("stop");
      await interaction.editReply("🔴 Apagando el servidor...");
    }

    if (commandName === "reiniciar") {
      await interaction.deferReply();
      await sendPowerAction("restart");
      await interaction.editReply("🔄 Reiniciando el servidor...");
    }

    if (commandName === "estado") {
      await interaction.deferReply();
      const status = await getServerStatus();
      const label = stateLabels[status.current_state] || status.current_state;

      const embed = new EmbedBuilder()
        .setTitle("Estado del servidor")
        .setColor(status.current_state === "running" ? 0x57f287 : 0xed4245)
        .addFields(
          { name: "Estado", value: label, inline: true },
          {
            name: "Memoria",
            value: status.resources ? formatBytes(status.resources.memory_bytes) : "N/A",
            inline: true,
          },
          {
            name: "CPU",
            value: status.resources ? `${status.resources.cpu_absolute.toFixed(1)}%` : "N/A",
            inline: true,
          }
        );

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(err);
    const errorMsg = "❌ Ocurrió un error al hablar con el panel. Revisa la consola del bot.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg);
    } else {
      await interaction.reply(errorMsg);
    }
  }
});

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

registerCommands().then(() => client.login(DISCORD_TOKEN));
