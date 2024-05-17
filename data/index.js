// Require the necessary discord.js classes
const fs = require('fs')
const path = require('path')
const { ActivityType, Client, Collection, EmbedBuilder, Events, GatewayIntentBits, Partials, messageLink} = require('discord.js');
const { token, vipChannelId } = require('./config.json');
const { messageMap } = require("./messageReplies");

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.MessageContent
	],
	partials: [
		Partials.Message, Partials.Reaction, Partials.User
	],
});

let programStartTime = new Date(Date.now()).toLocaleString('sv-SE');

const logFilePath = path.join(__dirname, `../logs/discord-bot_${programStartTime}.log`);
if (!fs.existsSync(path.join(__dirname, '../logs'))) {
	fs.mkdir(path.join(__dirname, '../logs'), err => {
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
client.once(Events.ClientReady, async readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
	// flavor text for status
	client.user.setActivity('with human souls', { type: ActivityType.Playing });
});

// define our keywords and reactions
function randomInList(array) {
	// return array[(Math.random() * array.length)];
	return array[3];
}
// occasionally send custom responses to messages containing keywords
client.on('messageCreate', async message => {
	// stop the infinite loop
	if (message.author.bot) return;
	// store message content
	let originalContent = message.content;

	// test all the strings
	for (let [key, value] of messageMap.entries()) {
		if (originalContent.includes(key)) {
			if (Math.random() < 0.4) {
				await message.reply(randomInList(value));
				return;
			}
		}
	}
});

// do the starboard thing
client.on(Events.MessageReactionAdd, async (reaction, user) => {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong fetching the reaction:', error);
			return;
		}
	}
	if (reaction.message.partial) {
		try {
			await reaction.message.fetch();
		} catch (error) {
			console.error('Something went wrong fetching the message:', error);
			return;
		}
	}
	if (user.partial) {
		try {
			await user.fetch();
		} catch (error) {
			console.error('Something went wrong fetching the user:', error);
			return;
		}
	}

	if (user.bot) {
		// ignore our own reactions to avoid any looping
		return;
	}
	let vipChannel = reaction.client.channels.cache.get(vipChannelId);
	if (reaction.message.reactions.cache.has('✅') && reaction.message.reactions.cache.get('✅').me) {
		console.log(`not VIPing message ${reaction.message.id} because it is already marked VIP`);
		return;
	}
	if ('smash' === reaction.emoji.name || 'mepls' === reaction.emoji.name) {
		if (reaction.count >= 7) {
			let message = reaction.message;
			const embed = new EmbedBuilder()
				.setColor(0xC71585)
				.setAuthor({ name: message.author.displayName, iconURL: message.author.avatarURL() })
				.setDescription(message.content.length > 0 ?
					message.content + `\n\[[Original Message](${messageLink(message.channelId, message.id)})\]`
					: `[Original Message](${messageLink(message.channelId, message.id)})`)
				.setImage(message.attachments.size > 0 ? message.attachments.at(0).url : null)
				.setTimestamp()
				.setFooter({ text: message.id, iconURL: client.user.avatarURL() });

			await vipChannel.send({ embeds: [embed] }).catch(console.error);
			await message.react('✅');
			console.log(`sent message with id ${message.id} to VIP`);
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
