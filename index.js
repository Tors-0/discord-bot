// Require the necessary discord.js classes
const fs = require('fs')
const path = require('path')
const { ActivityType, Client, Collection, Events } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
// calculate intents number at https://discord-intents-calculator.vercel.app
const client = new Client({intents: 34307});

let programStartTime = new Date(Date.now()).toLocaleString('sv-SE');

const logFilePath = path.join(__dirname, `logs/discord-bot_${programStartTime}.log`);
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
	fs.mkdir(path.join(__dirname, 'logs'), err => {
		if (err) {
			console.error('Error creating \'logs\' directory:' + err)
		} else {
			console.log('Successfully created \'logs\' directory')
		}
	});
} else {
	console.log('logs directory already exists, continuing...');
}

console.originalLog = console.log;

console.log = function(message) {
	fs.appendFile(logFilePath, message + '\n', (err) => {
		if (err) {
			console.error('Error appending to log file:', err);
		} else {
			console.originalLog(message);
		}
	});
}
console.log(`now logging to ${logFilePath}`);

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
	// flavor text for status
	client.user.setActivity('with human souls', { type: ActivityType.Playing });
});
let msgReplyPairs = new Map();
msgReplyPairs.set('helldiver', 'omg isn\'t that like deep rock galactic but with bigger bugs?');
msgReplyPairs.set('circus', 'im still sad about gummigoo =(');
msgReplyPairs.set('outer wilds', 'HOLY SHIT I LOVE OUTER WILDS');
// when pinged or in a reply, accuse the replied message of taking our position and delete the message with the ping
client.on('messageCreate', async message => {
	// store message content
	let originalContent = message.content;
	// stop the infinite loop
	if (message.author.bot) return;
	// test all the strings
	for (let [key, value] of msgReplyPairs.entries()) {
		if (originalContent.includes(key)) {
			if (Math.random() < 0.1) {
				await message.reply(value);
				return;
			}
		}
	}
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// Log in to Discord with your client's token
client.login(token);
