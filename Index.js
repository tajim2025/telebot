const { Telegraf } = require('telegraf');
const fs = require('fs');

// Bot Token
const bot = new Telegraf('7621162469:AAFGCxD3bceF-odwiouQBnOj5n7Wg05b5Zs');

// Admin Telegram ID
const ADMIN_ID = 5060004554;

// Initialize Database Files
function initDatabase() {
  if (!fs.existsSync('apps.json')) {
    fs.writeFileSync('apps.json', JSON.stringify({
      "color_prediction": [],
      "number_prediction": []
    }, null, 2));
  }
  
  if (!fs.existsSync('users.json')) {
    fs.writeFileSync('users.json', '[]');
  }
}

// Load Apps Database
function loadApps() {
  try {
    const data = fs.readFileSync('apps.json', 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Error loading apps:", e);
    return { color_prediction: [], number_prediction: [] };
  }
}

// Save Apps Database
function saveApps(apps) {
  fs.writeFileSync('apps.json', JSON.stringify(apps, null, 2));
}

// Load Users Database
function loadUsers() {
  try {
    const data = fs.readFileSync('users.json', 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Error loading users:", e);
    return [];
  }
}

// Save Users Database
function saveUsers(users) {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

// Initialize database
initDatabase();

// Main Menu
const mainMenu = [
  [{ text: '🎨 Color Prediction', callback_data: 'show_color_prediction' }],
  [{ text: '🔢 Number Prediction', callback_data: 'show_number_prediction' }]
];

// Admin Menu
const adminMenu = [
  [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }],
  [{ text: '📊 User Stats', callback_data: 'admin_stats' }],
  [{ text: '🗑 Remove App', callback_data: 'admin_remove_app' }],
  [{ text: '⬅️ Main Menu', callback_data: 'back_to_main' }]
];

// Start Command
bot.start((ctx) => {
  const user = ctx.from;
  const users = loadUsers();
  
  if (!users.find(u => u.id === user.id)) {
    users.push({ 
      id: user.id, 
      username: user.username || 'NoUsername',
      first_name: user.first_name || '',
      join_date: new Date().toISOString()
    });
    saveUsers(users);
    console.log(`New user: ${user.username || user.id}`);
  }

  ctx.reply(`*Hello ${user.first_name || 'User'}!*\n\nWelcome to the App Prediction Bot.`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: mainMenu }
  });
});

// [Previous commands: myid, admin, addapp, apps...]

// ==================== NEW FEATURES ====================

// Admin Broadcast
bot.action('admin_broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('❌ Access Denied!');
  }
  
  await ctx.reply('📢 Send the message you want to broadcast:');
  ctx.session.waitingForBroadcast = true;
});

bot.on('text', (ctx) => {
  if (ctx.from.id === ADMIN_ID && ctx.session.waitingForBroadcast) {
    const message = ctx.message.text;
    const users = loadUsers();
    
    ctx.reply(`⚡ Broadcasting to ${users.length} users...`);
    
    users.forEach(user => {
      try {
        bot.telegram.sendMessage(user.id, `📢 *Admin Announcement:*\n\n${message}`, {
          parse_mode: 'Markdown'
        });
      } catch (e) {
        console.error(`Failed to send to ${user.id}:`, e);
      }
    });
    
    ctx.session.waitingForBroadcast = false;
    ctx.reply('✅ Broadcast completed!');
  }
});

// User Stats
bot.action('admin_stats', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  const users = loadUsers();
  const today = new Date();
  const newUsers = users.filter(u => {
    const joinDate = new Date(u.join_date);
    return joinDate.toDateString() === today.toDateString();
  });
  
  ctx.reply(`📊 *User Statistics*\n\n` +
    `👥 Total Users: ${users.length}\n` +
    `🆕 New Today: ${newUsers.length}\n\n` +
    `📅 Last 5 Users:\n${
      users.slice(-5).map(u => 
        `- ${u.first_name} (@${u.username || 'no_username'})`
      ).join('\n')
    }`, { parse_mode: 'Markdown' });
});

// Remove App
bot.action('admin_remove_app', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  const apps = loadApps();
  const allApps = [
    ...apps.color_prediction.map(a => ({...a, category: 'color_prediction'})),
    ...apps.number_prediction.map(a => ({...a, category: 'number_prediction'}))
  ];
  
  if (allApps.length === 0) {
    return ctx.reply('❌ No apps available to remove!');
  }
  
  const buttons = allApps.map(app => [
    { 
      text: `${app.text} (${app.category.replace('_', ' ')})`, 
      callback_data: `remove_${app.category}_${app.callback_data}`
    }
  ]);
  
  buttons.push([{ text: '❌ Cancel', callback_data: 'back_to_admin' }]);
  
  await ctx.editMessageText('🗑 *Select an app to remove:*', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

// Handle App Removal
bot.on('callback_query', async (ctx) => {
  const data = ctx.update.callback_query.data;
  
  if (data.startsWith('remove_')) {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCbQuery('❌ Admin only!');
    }
    
    const parts = data.split('_');
    const category = parts[1];
    const appId = parts.slice(2).join('_');
    
    let apps = loadApps();
    apps[category] = apps[category].filter(a => a.callback_data !== appId);
    saveApps(apps);
    
    ctx.answerCbQuery('✅ App removed!');
    ctx.editMessageText(`✅ *${appId.replace(/_/g, ' ')}* removed from ${category}!`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: adminMenu }
    });
  }
  // [Previous callback handlers...]
});

// Admin Menu
bot.action('back_to_admin', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  await ctx.editMessageText('👑 *Admin Panel*', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: adminMenu }
  });
});

// [Rest of your existing code...]

bot.launch();
console.log('Bot is running...');
