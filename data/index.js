// Require the necessary discord.js classes
const fs = require('fs');
const path = require('path');
const portscanner = require('portscanner');
const { ActivityType, Client, Collection, EmbedBuilder, Events, GatewayIntentBits, Partials, messageLink,
	ChannelManager, ForumChannel, ThreadChannel
} = require('discord.js');
const { token, vipChannelId, reactionsChannelId, statusChannelId } = require('./config.json');
const { messageMap, gambaMap, awawaMap, statusMessages } = require("./messageReplies");
const {data} = require("./commands/utility/ping");

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
	return array.at(Math.random() * array.length);
}

// occasionally send custom responses to messages containing keywords
client.on('messageCreate', async message => {
	// stop the infinite loop
	if (message.author.bot) return;
	if (message.content.includes('<@1240360093296361493>')) {
		// be a cutie little bot
		for (let [key, value] of awawaMap.entries()) {
			if (message.content.search(key) !== -1) {
				await message.reply(randomInList(value));
				return;
			}
		}
	}

	// test all the strings
	for (let [key, value] of messageMap.entries()) {
		if (message.content.search(key) !== -1) {
			if (Math.random() < 0.3) {
				await message.reply(randomInList(value));
				return;
			}
		}
	}
	// GAMBA TEST
	for (let [key, value] of gambaMap.entries()) {
		if (message.content.search(key) !== -1) {
			await message.reply(randomInList(value));
			return;
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

	if (user.bot && user.id === 1240360093296361493) {
		// ignore our own reactions to avoid any looping
		return;
	}
	let vipChannel = reaction.client.channels.cache.get(vipChannelId);
	let reactionsChannel = reaction.client.channels.cache.get(reactionsChannelId);
	let canReaction = true;
	let canVIP = true;
	if (reaction.message.reactions.cache.has('✅') && reaction.message.reactions.cache.get('✅').me) {
		console.log(`not reactioning message ${reaction.message.id} because it is already marked reactioned`);
		canReaction = false;
	}
	if (reaction.message.reactions.cache.has('☑') && reaction.message.reactions.cache.get('☑').me) {
		console.log(`not VIPing message ${reaction.message.id} because it is already marked VIP`);
		canVIP = false;
	}

	if ('smash' === reaction.emoji.name || 'mepls' === reaction.emoji.name || 'pass' === reaction.emoji.name || 'minorjumpscare' === reaction.emoji.name) {
		if (reaction.count >= 5) {
			let message = reaction.message;
			const embed = new EmbedBuilder()
				.setColor(0xC71585)
				.setAuthor({ name: message.author.displayName, iconURL: message.author.avatarURL() })
				.setDescription(message.content.length > 0 ?
					message.content + `\n\[[Original Message](${messageLink(message.channelId, message.id)})\]`
					: `[Original Message](${messageLink(message.channelId, message.id)})`)
				.setImage(message.attachments.size > 0 ? message.attachments.at(0).url : message.embeds.length > 0 ? message.embeds.at(0).image : null)
				.setTimestamp()
				.setFooter({ text: message.id, iconURL: client.user.avatarURL() });

			if (canVIP) {
				await vipChannel.send({embeds: [embed]}).catch(console.error);
				await message.react('☑');
				console.log(`sent message with id ${message.id} to VIP`);
			}
		}
	} else {
		if (reaction.count >= 4) {
			let message = reaction.message;
			const embed = new EmbedBuilder()
				.setColor(0xC71585)
				.setTitle('a very ' + reaction.emoji.toString() + ' post')
				.setAuthor({ name: message.author.displayName, iconURL: message.author.avatarURL() })
				.setDescription(message.content.length > 0 ?
					message.content + `\n\n\[[Original Message](${messageLink(message.channelId, message.id)})\]`
					: `[Original Message](${messageLink(message.channelId, message.id)})`)
				.setImage(message.attachments.size > 0 ? message.attachments.at(0).url : message.embeds.length > 0 ? message.embeds.at(0).image : null)
				.setTimestamp()
				.setFooter({ text: message.id, iconURL: client.user.avatarURL() });

			if (reaction.client.channels.cache.get(message.channelId).nsfw) {
				if (canVIP) {
					await vipChannel.send({embeds: [embed]}).catch(console.error);
					await message.react('☑');
					console.log(`sent message with id ${message.id} to VIP (nsfwchannel)`);
				}
			} else {
				if (reaction.client.channels.cache.get(message.channelId).isThread()) {
					if (reaction.client.channels.cache.get(message.channelId).parent.nsfw) {
						if (canVIP) {
							await vipChannel.send({embeds: [embed]}).catch(console.error);
							await message.react('☑');
							console.log(`sent message with id ${message.id} to VIP (nsfwthread)`);
						}
					} else {
						if (canReaction) {
							await reactionsChannel.send({embeds: [embed]}).catch(console.error);
							await message.react('✅');
							console.log(`sent message with id ${message.id} to reactions (normiethread)`);
						}
					}
				} else {
					if (canReaction) {
						await reactionsChannel.send({embeds: [embed]}).catch(console.error);
						await message.react('✅');
						console.log(`sent message with id ${message.id} to reactions (normiechannel)`);
					}
				}
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

let lastDockerStatus = "start";
let lastTunnelStatus = "";
let lastPublicStatus = "";

if (!fs.existsSync(path.join(__dirname, '../tmps'))) {
	fs.mkdir(path.join(__dirname, '../tmps'), err => {
		if (err) {
			console.error('Error creating \'tmps\' directory:' + err)
		} else {
			console.log('Successfully created \'tmps\' directory')
		}
	});
} else {
	console.log('tmps directory already exists, continuing...');
}

async function uptimeReport(dockerStat, tunnelStat, publicStat, assessment) {
	let uptimeChannel = client.channels.cache.get(statusChannelId);
	if (tunnelStat.trim().length <= 3) tunnelStat = "unreachable";
	if (publicStat.trim().length <= 3) publicStat = "unreachable";

	let color;
	let msg;
	switch (assessment) {
		case "-1":
			color = 0xFFFF00;
			msg = 'Possibly Down';
			break;
		case "0":
			color = 0x00FF00;
			msg = 'Server Up';
			break;
		case "1":
			color = 0xFF0000;
			msg = 'Server Down'
			break;
		default:
			color = 0x000000;
			msg = 'Unknown';
	}

	let newEmbed = new EmbedBuilder()
		.setColor(color)
		.setTitle(msg)
		.addFields(
			{name: 'Docker Status', value: dockerStat, inline: true},
			{name: 'Tunnel Status', value: tunnelStat, inline: true},
			{name: 'Public Status', value: publicStat, inline: true}
		)
		.setFooter({ text: randomInList(statusMessages) });

	await uptimeChannel.send({embeds: [newEmbed]});
}

let jsonLocation = path.join(__dirname, '../tmps/tmp-formatted.json');
let lastAssessment = null;
let concurrentPossibleDowns = 0;

setInterval(async () => {
	let jsonData = JSON.parse(fs.readFileSync(jsonLocation, 'utf8'));

	let { dockerStat, tunnelStat, publicStat } = jsonData;
	await portscanner.checkPortStatus(25565, 'klaymore.me').then(function(status) {
		publicStat = status;
	});
	if (dockerStat.length === 0) dockerStat = "docker not installed :p";

	if ((dockerStat).includes("(healthy)") !== lastDockerStatus.includes("(healthy)")
		|| ((tunnelStat).trim().length <= 3 !== (lastTunnelStatus.trim().length <= 3))
		|| ((publicStat).includes("open") !== (lastPublicStatus.includes("open")))
		|| lastDockerStatus.includes("start"))
	{
		// determine up/down
		let dockerUp = dockerStat.includes("(healthy)");
		let tunnelUp = (tunnelStat).trim().length > 3;
		let publicUp = (publicStat).includes("open");

		let assessment = (dockerUp && tunnelUp) ? (publicUp ? "0" : "-1") : "1";

		if (assessment === "-1") {
			concurrentPossibleDowns++;
			
			if (concurrentPossibleDowns >= 5) {
				// send report if we have several possibly down statuses in a row
				uptimeReport(dockerStat, tunnelStat, publicStat, assessment).then(() => {
					lastDockerStatus = dockerStat;
					lastTunnelStatus = tunnelStat;
					lastPublicStatus = publicStat;
				});
			}
		} else {
			concurrentPossibleDowns = 0;
			
			// send report
			uptimeReport(dockerStat, tunnelStat, publicStat, assessment).then(() => {
				lastDockerStatus = dockerStat;
				lastTunnelStatus = tunnelStat;
				lastPublicStatus = publicStat;
			});
		}

		lastAssessment = assessment;
	}
}, 60_000);
