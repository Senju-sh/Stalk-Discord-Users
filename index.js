const { Client } = require('ssj-v13.js'),fetch = require('node-fetch'),fs = require('fs'),senju = new Client({ws: {properties: {os: 'Linux',browser: 'Discord Client',release_channel: 'stable',client_version: '1.0.9011',os_version: '10.0.22621',os_arch: 'x64',system_locale: 'en-US',client_build_number: 175517,native_build_number: 29584,client_event_source: null,design_id: 0,}}}),config = require("config.json")
let lastAvatar = null,lastBanner = null,lastStatus = null;

senju.on('ready', () => {
  console.log(`${senju.user.username} Commence a Stalk`);
});
senju.on('userUpdate', async (oldUser, newUser) => {
  if (newUser.id === config.cible) {
      const user = await senju.users.fetch(newUser.id);

      if (user.avatar !== lastAvatar) {
          lastAvatar = user.avatar; 
      const embed = {
        title: `Changement d'avatar`,
        description: `\`${newUser.tag}\``,
        color: 0xFFFFFF,
        fields: [{name: `New Avatar : ${newUser.displayAvatarURL({ dynamic: true, size: 4096 })}`, inline: true }],
      };

      fetch(config.avatarWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      }).then(response => console.log(response))
        .catch(error => console.log(error));
    }

    if (newUser.banner !== lastBanner) {
      lastBanner = newUser.banner; 

      const embed = {
        title: `Changement de bannière`,
        description: `\`${newUser.tag}\``,
        color: 0xFFFFFF,
        fields: [{name: `New banner : ${newUser.bannerURL({ dynamic: true, size: 4096 })}`, inline: true }],
      };

      fetch(config.bannerWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      }).then(response => console.log(response))
        .catch(error => console.log(error));
    }
  }
});
senju.on('presenceUpdate', (oldPresence, newPresence) => {
    if (newPresence.userId === config.cible) {
        const newStatus = newPresence.activities.find(activity => activity.type === 'CUSTOM');

        if (newStatus && (!lastStatus || newStatus.state !== lastStatus)) {
            lastStatus = newStatus.state; 

            const status_info = {
                username: newPresence.user.tag,
                newStatus: newStatus.state,
                triggerUserId: newPresence.userId
            };

            const embed = {
                title: `Changement de status`,
                description: `\`${status_info.username}\``,
                color: 0xFFFFFF,
                fields: [{ name: 'Ancien : ', value: `\`${status_info.lastStatus}\``, inline: true },{ name: 'Nouveau : ', value: `\`${status_info.newStatus}\``, inline: true }],
            };

            fetch(config.statusWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ embeds: [embed] }),
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
          if ((member.voice.channel || oldState.channel) && (member.voice.channel?.guild.id === guild.id || oldState.channel?.guild.id === guild.id)) {
            const isHidden = member.voice.channel && !member.voice.channel.permissionsFor(senju.user).has('VIEW_CHANNEL');
            const user_info = {
              username: user.tag,
              voiceChannelId: member.voice.channel ? member.voice.channel.id : oldState.channelID,
              voiceChannelName: member.voice.channel ? member.voice.channel.name : oldState.channel.name,
              guildName: guild.name,
              isHidden: isHidden,
              otherUsers: member.voice.channel ? member.voice.channel.members.filter(m => m.id !== config.cible).map(m => ({ username: m.user.tag, id: m.id, mute: m.voice.mute, deaf: m.voice.deaf, streaming: m.voice.streaming, video: m.voice.selfVideo })) : [],
              inviteUrl: `https://discord.com/channels/${guild.id}/${member.voice.channel ? member.voice.channel.id : oldState.channelID}`,
              triggerUserId: newState.id,
              action: oldState.channel && !newState.channel ? 'quitté' : 'rejoint'
            };

            const embed = {
              title: `Update Channel`,
              description: `L'utilisateur \`${user_info.username}\` a \`${user_info.action}\` le channel vocal\n> Serveur : \`${user_info.guildName}\`\n> Vocal : <#${user_info.voiceChannelId}\n> Nombre d'utilisateurs : \`${user_info.otherUsers.length}\`\n> [\`Rejoindre le vocal\`](<${user_info.inviteUrl}>)\n> Vocal caché : \`${user_info.isHidden ? 'Oui' : 'Non'}\``,
              color: 0xFFFFFF,
              fields: user_info.otherUsers.map(user => ({ name: user.username, value: `ID : <@${user.id}>\nMute : ${user.mute ? '`Oui`' : '`Non`'}\nDeaf : ${user.deaf ? '`Oui`' : '`Non`'}\nStreaming : ${user.streaming ? '`Oui`' : '`Non`'}\nVideo : ${user.video ? '`Oui`' : '`Non`'}`, inline: true })),
            };

            if (user_info.triggerUserId) {
              embed.fields.push({ name: 'Update', value: `<@${user_info.triggerUserId}> a ${user_info.action} la vocal`, inline: true });
            }

            fetch(config.voiceWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ embeds: [embed] }),
            });
          }
        }
      });
    });
  }
});
senju.on('messageDelete', message => {
  if (message.partial) {
  } else {
    if (message.author.id === config.cible) {
      const message_info = {
        username: message.author.tag,
        content: message.content,
        guildName: message.guild ? message.guild.name : 'DM',
        channelName: message.channel.name,
        messageId: message.id,
        triggerUserId: message.author.id
      };

      const embed = {
        title: `Message Supprimé`,
        description: `\`${message_info.username}\`\n> Serveur : \`${message_info.guildName}\`\n> Canal : \`${message_info.channelName}\`\n> Contenu : \`${message_info.content}\``,
        color: 0xFFFFFF,
        fields: [{ name: 'Action', value: `<@${message_info.triggerUserId}> a supprimé un message.`, inline: true }],
      };

      fetch(config.messageWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }
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
      description: `\`${message_info.username}\`\n> Serveur : \`${message_info.guildName}\`\n> Canal : \`${message_info.channelName}\`\n> Ancien contenu : \`${message_info.oldContent}\`\n> Nouveau contenu : \`${message_info.newContent}\``,
      color: 0xFFFFFF,
      fields: [{ name: 'Action', value: `<@${message_info.triggerUserId}> a modifié un message`, inline: true }],
    };

    fetch(messageWebhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json',},
      body: JSON.stringify({ embeds: [embed] }),
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
      title: `Nouveau Message`,
      description: `\`${message_info.username}\`\n> Serveur : \`${message_info.guildName}\`\nCanal : <#${message_info.messagechannelId}> \nContenu : \`${message_info.content}\``,
      color: 0xFFFFFF,
      fields: [{ name: 'Action', value: `<@${message_info.triggerUserId}> a envoyé un message.`, inline: true }],
    };

    fetch(messageWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
  }
})
senju.login(config.token);