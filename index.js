const { Client } = require('ssj-v13.js'), fetch = require('node-fetch'), fs = require('node:fs'), senju = new Client({ ws: { properties: { os: 'Linux', browser: 'Discord Client', release_channel: 'stable', client_version: '1.0.9011', os_version: '10.0.22621', os_arch: 'x64', system_locale: 'en-US', client_build_number: 175517, native_build_number: 29584, client_event_source: null, design_id: 0, } } }), config = require("./config.json")
let lastStatus = null;

senju.on('ready', () => {
  console.log(`[ Senju | Stalker : ${senju.user.username} ]`);
});

senju.on('userUpdate', async (oldUser, newUser) => {
  if (newUser.id === config.cible) {
    const user = await senju.users.fetch(newUser.id);

    if (newUser.avatarURL !== oldUser.avatarURL) {
      lastAvatar = user.avatar;
      const embed = {
        title: `Changement d'avatar`,
        description: `\`${newUser.tag}\``,
        color: 0xFFFFFF,
        fields: [{ name: `New Avatar : ${newUser.displayAvatarURL({ dynamic: true, size: 4096 })}`, inline: true },{ name: 'Heure', value: new Date().toLocaleString(), inline: true }]
      };

      fetch(config.avatarWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          username: `Senju | Avatar`,
          avatar_url: config.lien
        }),
      }).then(response => console.log(response))
        .catch(error => console.log(error));
    }

    if (oldUser.bannerURL !== newUser.bannerURL) {
      const embed = {
        title: `Changement de bannière`,
        description: `\`${newUser.tag}\``,
        color: 0xFFFFFF,
        fields: [{ name: `New banner : ${newUser.bannerURL({ dynamic: true, size: 4096 })}`, inline: true },{ name: 'Heure', value: new Date().toLocaleString(), inline: true }]
      };
      embed.image = newUser.bannerURL({ dynamic: true, size: 4096 })

      fetch(config.bannerWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          username: `Senju | Banner`,
          avatar_url: config.lien
        }),
      }).then(response => console.log(response))
        .catch(error => console.log(error));
    }
  }
});

senju.on('presenceUpdate', (oldPresence, newPresence) => {
  if (newPresence.userId === config.cible) {
    const newStatus = newPresence.activities.find(activity => activity.type === 'CUSTOM');

    if (newStatus && (newStatus.state !== lastStatus)) {
      const status_info = {
        username: newPresence.user.tag,
        newStatus: newStatus.state,
        triggerUserId: newPresence.userId
      };

      const embed = {
        title: `Changement de status`,
        description: `\`${status_info.username}\``,
        color: 0xFFFFFF,
        fields: [{ name: 'Nouveau : ', value: `\`${status_info.newStatus}\``, inline: true },{ name: 'Heure', value: new Date().toLocaleString(), inline: true }]
      };

      fetch(config.statusWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          username: `Senju | Status`,
          avatar_url: config.lien
        }),
      }).then(response => console.log(response))
        .catch(error => console.log(error));
    }
  }
});

senju.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.id === config.cible || oldState.id === config.cible ||
    (newState.channel && newState.channel.members.has(config.cible)) ||
    (oldState.channel && oldState.channel.members.has(config.cible))) {

    senju.users.fetch(config.cible).then(user => {
      senju.guilds.cache.forEach(guild => {
        if (guild.members.cache.has(user.id)) {
          const member = guild.members.cache.get(user.id);

          if ((member.voice.channel || oldState.channel) &&
            (member.voice.channel?.guild.id === guild.id || oldState.channel?.guild.id === guild.id)) {

            const isHidden = member.voice.channel && !member.voice.channel.permissionsFor(senju.user).has('VIEW_CHANNEL');
            const user_info = {
              username: user.tag,
              voiceChannelId: member.voice.channel ? member.voice.channel.id : oldState.channelID,
              voiceChannelName: member.voice.channel ? member.voice.channel.name : oldState.channel.name,
              guildName: guild.name,
              isHidden: isHidden,
              otherUsers: member.voice.channel ? member.voice.channel.members.filter(m => m.id).map(m => ({
                username: m.user.tag,
                id: m.id,
                mute: m.voice.mute,
                deaf: m.voice.deaf,
                streaming: m.voice.streaming,
                video: m.voice.selfVideo
              })) : [],
              inviteUrl: `https://discord.com/channels/${guild.id}/${member.voice.channel ? member.voice.channel.id : oldState.channelID}`,
              triggerUserId: newState.id,
              action: oldState.channel && !newState.channel ? 'quitté' : 'rejoint',
              muteAction: (oldState.mute !== newState.mute) ? (newState.mute ? 'mute' : 'unmute') : null
            };

            const embed = {
              title: `Update Channel`,
              description: `\`${user_info.username}\`\n<@${user_info.triggerUserId}> | \`vient de ${user_info.action}\`\n> Serveur : \`${user_info.guildName}\`\n> Vocal : <#${user_info.voiceChannelId || "`Channel quitté par la cible`"}>\n> Nombre d'utilisateurs : \`${user_info.otherUsers.length}\`\n> [\`Rejoindre le vocal\`](<${user_info.inviteUrl}>)\n> Vocal caché : \`${user_info.isHidden ? 'Oui' : 'Non'}\``,
              color: 0xFFFFFF,
              fields: user_info.otherUsers.map(user => ({
                name: user.username,
                value: `ID : <@${user.id}>\nMute : ${user.mute ? '`Oui`' : '`Non`'}\nDeaf : ${user.deaf ? '`Oui`' : '`Non`'}\nStreaming : ${user.streaming ? '`Oui`' : '`Non`'}\nVideo : ${user.video ? '`Oui`' : '`Non`'}`,
                inline: true
              },{ name: 'Heure', value: new Date().toLocaleString(), inline: true })),
            };

            if (user_info.muteAction) {
              embed.fields.push({
                name: 'Action',
                value: `<@${newState.id}> s'est ${user_info.muteAction}`,
                inline: true
              });
            }

            if (user_info.triggerUserId) {
              embed.fields.push({ name: 'Update', value: `<@${user_info.triggerUserId}>`, inline: true });
              
              fetch(config.voiceWebhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  embeds: [embed],
                  username: `Senju | Voice`,
                  avatar_url: config.lien
                }),
              })
            }
          }
        }
      });
    });
  }
})

senju.on('messageDelete', async message => {
  if (message.partial) {
    message = await message.fetch();
  }

  if (message.author.id === config.cible) {
    const message_info = {
      username: message.author.tag,
      content: message.content || '📂 Pas de contenu 📂',
      guildName: message.guild ? message.guild.name : 'DM',
      channelName: message.channel.name,
      messageId: message.id,
      messagechannelId: message.channel.id,
      triggerUserId: message.author.id,
      attachments: message.attachments.map(a => a.url)
    };

    const embed = {
      title: `Message Supprimé`,
      description: `> \`${message_info.username}\`\n> Serveur : \`${message_info.guildName}\`\n> Canal : <#${message_info.messagechannelId}>\n> Contenu : [\`${message_info.content}\`](<https://senju.cc>)`,
      color: 0xFFFFFF,
      fields: [
        { name: 'Action', value: `<@${message_info.triggerUserId}> a supprimé un message.`, inline: true },
        { name: 'Heure', value: new Date().toLocaleString(), inline: true }
      ]
    };

    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType.startsWith('image/')) {
        embed.image = { url: attachment.url };
      } else if (attachment.contentType.startsWith('video/')) {
        embed.fields.push({ name: 'Vidéo', value: `[<:spookywhiteghost:1271357774584090646>・Télécharger la vidéo](<${attachment.url}>)`, inline: false });
        embed.image = { url: attachment.url };
      }
    }

    fetch(config.messageWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
        username: `Senju | Message Supprimé`,
        avatar_url: config.lien
      }),
    });
  }
});

senju.on('messageUpdate', (oldMessage, newMessage) => {
  if (newMessage.author && newMessage.author.id === config.cible) {

    const message_info = {
      username: newMessage.author.tag,
      oldContent: oldMessage.content,
      newContent: newMessage.content,
      guildName: newMessage.guild ? newMessage.guild.name : 'DM',
      channelName: newMessage.channel.name,
      messageId: newMessage.id,
      triggerUserId: newMessage.author.id
    };

    const embed = {
      title: `Message Modifié`,
      description: `> \`${message_info.username}\`\n> Serveur : \`${message_info.guildName}\`\n> Canal : \`${message_info.channelName}\`\n> Ancien contenu : \`${message_info.oldContent}\`\n> Nouveau contenu : \`${message_info.newContent}\``,
      color: 0xFFFFFF,
      fields: [{ name: 'Action', value: `<@${message_info.triggerUserId}> a modifié un message`, inline: true },{ name: 'Heure', value: new Date().toLocaleString(), inline: true }]
    };

    fetch(config.messageWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({
        embeds: [embed],
        username: `Senju | Message Modifié`,
        avatar_url: config.lien
      }),
    });
  }
});

senju.on('messageCreate', message => {
  if (message.author.id === config.cible) {
    
    const message_info = {
      username: message.author.tag,
      content: message.content,
      guildName: message.guild ? message.guild.name : 'DM',
      channelName: message.channel.name,
      messageId: message.id,
      messagechannelId: message.channel.id,
      triggerUserId: message.author.id
    };

    const embed = {
      title: `Message Envoyé`,
      description: `> \`${message_info.username}\`\n> Serveur : \`${message_info.guildName}\`\nCanal : <#${message_info.messagechannelId}> \nContenu : [\`${message_info.content || `📂 Pas du texte 📂`}\`](<https://senju.cc>)`,
      color: 0xFFFFFF,
      fields: [
        { name: 'Action', value: `<@${message_info.triggerUserId}> a envoyé un message.`, inline: true },
        { name: 'Heure', value: new Date().toLocaleString(), inline: true }
      ],
    };

    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType.startsWith('image/')) {
        embed.image = { url: attachment.url };
      } else if (attachment.contentType.startsWith('video/')) {
        embed.fields.push({ name: 'Vidéo', value: `[<:spookywhiteghost:1271357774584090646> Télécharger la vidéo <:spookywhiteghost:1271357774584090646>](<${attachment.url}>)`, inline: false });
        embed.image = { url: attachment.url };
      }
    }

    fetch(config.messageWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
        username: `Senju | Nouveau Message`,
        avatar_url: config.lien
      }),
    });
  }
});

async function errorHandler(error) {
  const errors = [0, 400, 10062, 10008, 50035, 40032, 50013]
  if (errors.includes(error.code)) return;
  console.log(error)
}

process.on("unhandledRejection", errorHandler);
process.on("uncaughtException", errorHandler);

senju.login(config.token);