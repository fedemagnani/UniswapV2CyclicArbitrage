const Discord = require('discord.js');

class DiscordWebhooks {
    constructor() { }

    arbWentThrough(webhook, hash, route){
        var title = `Arbitrage!`
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        var embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor('#03b2f8')
            .setDescription(""+String(hash))
            .setTimestamp()
        try{
            embed.addFields(
                { name: 'Link', value: `${route}tx/${String(hash)}`, inline: false },
            )
        }catch(e){}
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    arbitrageAlert(webhook,data,dex){
        var title = `Possible arbitrage on ${dex}!`
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor('#03b2f8')
            .addFields(
                { name: 'Path', value: String(data.Tokens.join("\n")), inline: false },
                { name: 'Input', value: String(data.Input), inline: false },
                { name: 'Outputs', value: String(data.Outs), inline: false },
                { name: 'Gain', value: String(data.Gain), inline: false },
            )
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    cheapPunkSpotted(webhook, punk) {
        var title = `Found a punk (rank ${punk.ranking}) for ${punk.price} SOL!`
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor('#8f00ff')
            .setImage(punk.link_img)
            .addFields(
                // { name: 'ID', value: `#${punk.id}`, inline: false},
                { name: 'Rank', value: `#${punk.ranking}`, inline: true },
                { name: 'Attributes', value: punk.attributes, inline: false },
                { name: 'Token Address', value: punk.token_add, inline: false },
                { name: 'Price', value: punk.price + " SOL", inline: false },
                { name: 'Previous price', value: punk.lastSoldPrice ? punk.lastSoldPrice + " SOL" : "Unknown", inline: false },
                { name: 'Skin', value: punk.skin, inline: false },
                { name: 'Gender', value: punk.type, inline: false },
                { name: 'Link', value: `https://solanart.io/search/?token=${punk.token_add}`, inline: false },
            )
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    cheapPunkSpottedTiny(webhook, punk) {
        var title = `Found ${punk.name} for ${punk.price_sol} SOL!`
        console.log(title)
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor('#8f00ff')
            .setImage(punk.img_url)
            .addFields(
                // { name: 'ID', value: `#${punk.id}`, inline: false},
                { name: 'Token Address', value: punk.token_add, inline: false },
                { name: 'Price', value: punk.price_sol + " SOL", inline: false },
                { name: 'Link', value: `https://solanart.io/search/?token=${punk.token_add}`, inline: false },
            )
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    newSaleSpotted(webhook, punk) {
        var title = `Sold ${punk.name} for ${punk.price} SOL!`
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor('#8f00ff')
            .setImage(punk.link_img)
            .addFields(
                // { name: 'ID', value: `#${punk.id}`, inline: false},
                { name: 'Rank', value: `#${punk.ranking ? punk.ranking : "NaN"}`, inline: true },
                { name: 'Attributes', value: punk.attributes ? punk.attributes : "NaN", inline: false },
                { name: 'Token Address', value: punk.token_add ? punk.token_add : "NaN", inline: false },
                { name: 'Price', value: punk.price ? punk.price : "NaN" + " SOL", inline: false },
                { name: 'Seller address', value: punk.seller_address ? punk.seller_address : "NaN", inline: false },
                { name: 'Buyer address', value: punk.buyerAdd ? punk.buyerAdd : "NaN", inline: false },
                { name: 'Escrow address', value: punk.escrowAdd ? punk.escrowAdd : "NaN", inline: false },
                { name: 'Program ID', value: punk.programId ? punk.programId : "NaN", inline: false },
                { name: 'Date', value: punk.date ? punk.date : "NaN", inline: false }
            )
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    errorLogs(webhook, error) {
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        // return null
        if(!error){
            return
        }
        if(JSON.stringify(error.stack)&&JSON.stringify(error.stack).length>=1000){
            error.stack = JSON.stringify(error.stack).substr(0,999)
        }
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Error occurred: program stopped")
            .setColor('#FF0000')
            .setDescription("" + error.stack)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    errorLogsME(webhook, error) {
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        // return null
        if(!error){
            return
        }
        if(JSON.stringify(error.stack).length>=1000){
            error.stack = JSON.stringify(error.stack).substr(0,999)
        }
        if(JSON.stringify(error.stack).includes(" 429")){ //skippiamo gli errori 429
            return 
        }
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Error occurred: program stopped (Magic Eden)")
            .setColor('#FF0000')
            .setDescription("" + error.stack)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    errorLogsDE(webhook, error) {
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        // return null
        if(!error){
            return
        }
        if(JSON.stringify(error.stack).length>=1000){
            error.stack = JSON.stringify(error.stack).substr(0,999)
        }
        if(JSON.stringify(error.stack).includes(" 429")){ //skippiamo gli errori 429
            return 
        }
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Error occurred: program stopped (Digital Eyes)")
            .setColor('#FF0000')
            .setDescription("" + error.stack)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    restartMessage(webhook) {
        // const webhookToken=webhook.split('/').pop()
        // const webhookID=webhook.split('/').splice(-2,1).pop()
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Program Restarted")
            .setColor('#8f00ff')
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    tuttoOk(webhook) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Va tutto BENE!")
            .setColor('#32CD32')
            .setTimestamp()
            .setImage("https://media.istockphoto.com/vectors/approval-symbol-check-mark-in-a-circle-drawn-by-hand-vector-green-ok-vector-id1094780808?k=6&m=1094780808&s=170667a&w=0&h=HdOotJd0WF0qwEhZRwx9xC_b-UNcXkbl44dYUjPOXD8=")
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    newBuyOnChain(webhook, signature) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Nuovo acquisto sulla blockchain")
            .setColor('#32CD32')
            .setDescription("" + signature)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    newBuyOnChainME(webhook, signature) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Nuovo acquisto sulla blockchain (Magic Eden) DAL LAPTOP")
            .setColor('#DC1FFF')
            .setDescription("" + signature)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    newBuyOnChainDE(webhook, signature) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Nuovo acquisto sulla blockchain (Digital Eyes)")
            .setColor('#03E1FF')
            .setDescription("" + signature)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    newBuyOnChainAL(webhook, signature) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Nuovo acquisto sulla blockchain (Alpha Art)")
            .setColor('#000000')
            .setDescription("" + signature)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    newBuyOnChainv3(webhook, signature) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Nuovo acquisto sulla blockchain (CON V3!!)")
            .setColor('#32CD32')
            .setDescription("" + signature)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    async timestampsTask(webhook, timestamps) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        var fieldz = []
        for (var z = 0; z < Object.keys(timestamps).length; z++) {
            var w = { name: Object.keys(timestamps)[z], value: Object.values(timestamps)[z] + " secs", inline: true }
            fieldz.push(w)
        }
        var ww= { name: "Timestamp Now", value: new Date(Date.now()).toTimeString(), inline: false }
        fieldz.push(ww)
        const embed = new Discord.MessageEmbed()
            .setTitle("Timestamps")
            .setColor('#32CD32')
            .addFields(fieldz)
            .setTimestamp()
        await webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    sendMessage(webhook, message) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Messaggino")
            .setDescription("" + message)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

    sendWarning(webhook, message) {
        const webhookClient = new Discord.WebhookClient({ url: webhook });
        const embed = new Discord.MessageEmbed()
            .setTitle("Warning ⚠️!")
            .setColor('#FFFF00')
            .setDescription("" + message)
            .setTimestamp()
        webhookClient.send({
            content: null,
            username: null,
            avatarURL: null,
            embeds: [embed],
        });
    }

}

module.exports = DiscordWebhooks