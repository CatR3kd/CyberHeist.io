const express = require('express');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { RateLimiterMemory } = require('rate-limiter-flexible');
const path = require('path');
const bcrypt = require('bcrypt');
const EmailValidator = require('email-deep-validator');
const emailValidator = new EmailValidator();
const Filter = require('bad-words');
const filter = new Filter();
const fs = require('fs');
const Database = require('@replit/database');
const { fetch } = require('undici');

const connectedUsers = new Map();
const gameHacks = new Map();
const usersBeingHacked = new Map();
var playersOnline = [];
var chatCounter = 0;



// DATABASE



// Create Database
const db = new Database();

// Check if the database is empty
(async function() {
	const keys = await db.list();
  
  if(keys.length <= 0){
    console.log('The database is empty, you may need to create an empty user account.');
  }
})();

async function getUsers(){
  return await db.getAll();
}

async function setUser(username, hash, email, gameStats, suspentionStatus){
  const userObj = {
    username: username,
    password: hash,
    email: email,
    gameStats: gameStats,
    suspentionStatus: suspentionStatus
  }
  
  return await db.set(username, userObj);
}



// SETTINGS



// Server cheat detection settings

const serverCheatDetection = true;
const maximumAvgPerSecond = 40;
const stolenThreshold = 1_000_000_000;


// Client cheat detection settings

const clientCheatDetection = true;
const clientCheatDetectionSettings = {
  antiConsoleEnabled: true,
  autoClickerOptions: {
    clicksToSave: 40,
    detectNonhumanClick: true,
    detectClickInterval: {
      enabled: true,
      margin: 10
    },
    detectFastClicking: {
      enabled: true,
      maximumAvgPerSecond: 40
    }
  }
}


// Permitions and roles

const owners = [
  'CatR3kd'
];
const moderators = [
  'CatR3kd',
  'Cosmic',
  'haroon',
  'Conspicuous',
  'Jake'
];


// Automatic message

const autoMessage = true;
const autoMessageTxt = 'Thanks for playing CyberHeist! Be sure to give it a like if you enjoy it. If you need anything, check the Discord server: https://discord.gg/ppPZX4D7Wf';
const autoMessageInterval = 10 * 60 * 1000;
const minimumMessagesBeforeAutoMessage = 10;



// INITIALIZATION



http.listen(8000, () => {
  console.log(`Up online at ${getFormattedDate()}`);
});

app.use(express.static(path.join(__dirname + '/Public')));



// AUTOMESSAGE SETUP



if(autoMessage == true){
  setInterval(function(){
    if(chatCounter >= minimumMessagesBeforeAutoMessage){
      const chatObj = {
          sender: 'Game',
          message: autoMessageTxt,
          badgeColor: 'red'
        }

      chatCounter = 0;
      io.emit('chat', chatObj);
    }
  }, autoMessageInterval);
}



// RATELIMITS



const userDataRateLimit = new RateLimiterMemory({
  points: 1,
  duration: 15
});

const usersOnlineRateLimit = new RateLimiterMemory({
  points: 1,
  duration: 10
});

const sendChatRateLimit = new RateLimiterMemory({
  points: 5,
  duration: 2
});

const hackRateLimit = new RateLimiterMemory({
  points: 2,
  duration: 600
});



// LEADERBOARD SETUP



var leaderboard = [];
fullLeaderboardUpdate();



// SOCKET.IO



io.on('connection', (socket) => {
  // Emit leaderboard on connection
  if(leaderboard.length > 0) socket.emit('leaderboardUpdate', leaderboard);
  if(clientCheatDetection == true)  socket.emit('cheatDetectionSettings', clientCheatDetectionSettings);

  // Create account and login on signup
  socket.on('signUp', (user) => {
    createAccount(user.username, user.password, user.email).then(function (res) {
      if(res.error == false){
        const userObj = {
          username: res.message.username,
          gameStats: res.message.gameStats
        }

        // Set up server variables
        connectedUsers.set(socket.id, userObj);
        connectedUsers.set(res.message.username, socket.id);
        playersOnline.push(res.message.username);
      }
      
      socket.emit('signedUp', res);
    })
    .catch(err => {
      console.error(err);
    });
  });

  // Emit user data on successful login
  socket.on('login', (user) => {
    // Check if user is already connected
    if(connectedUsers.has(user.username)){
      socket.emit('loggedIn', {error: true, message: 'User is already logged in!'});
      return;
    }
    
    login(user.username, user.password, socket).then(function (res) {
      if(res.error == false){
        const userObj = {
          username: res.message.username,
          gameStats: res.message.gameStats
        }

        // Set up server variables
        connectedUsers.set(socket.id, userObj);
        connectedUsers.set(res.message.username, socket.id);
        playersOnline.push(res.message.username);
      }

      // Emit result
      socket.emit('loggedIn', res);
    })
    .catch(err => {
      console.error(err);
    });
    
  });

  // Emit three random online users for the hack menu
  socket.on('onlineUsersRequest', async () => {
    try {
      await usersOnlineRateLimit.consume((connectedUsers.get(socket.id)).username);
      
      const userList = getThreeOnlinePlayers();
      
      socket.emit('usersOnline', userList);
    } catch(rejRes) {
      // Ratelimited
    }
  });

  // Update user data and check for cheats
  socket.on('userData', async (userObj) => {
    try {
      await userDataRateLimit.consume((connectedUsers.get(socket.id)).username);
      
      updateUserData(userObj, socket);
    } catch(rejRes) {
      // Ratelimited
    }
  });
  
  // Hack user
  socket.on('hack', async (hackObj) => {
      
    const user = await db.get(hackObj.hacker.username);
    const victim = await db.get(hackObj.victim);
    
    // Make sure the hacker exists
    if(!user) return socket.emit('hackReturn', {error: true, message: 'user does not exist'});

    if(!(validateUserWithSocket(hackObj.hacker.username, socket.id))) return socket.emit('hackReturn', {error: true, message: 'an internal error has occured.'});
    
    // Make sure victim exists
    if(!victim) return socket.emit('hackReturn', {error: true, message: 'victim does not exist'});

    // Make sure victim is online
    if(!(connectedUsers.has(hackObj.victim))) return socket.emit('hackReturn', {error: true, message: 'victim is not online'});
    
    // Make sure victim has at least $10000
    if(victim.gameStats.money <= 10000) return socket.emit('hackReturn', {error: true, message: 'victim does not have enough money'});
    
    // Make sure victim is not being hacked
    if(usersBeingHacked.has(victim.username)) return socket.emit('hackReturn', {error: true, message: 'victim is already being hacked'});

    // Make sure victim is not the hacker
    if(hackObj.hacker.username == hackObj.victim) return socket.emit('hackReturn', {error: true, message: 'you cannot hack yourself'});
    
    // Get correct of points to consume
    var pointsToConsume = 2;
      
    if(user.gameStats.otherUpgrades.doubleHacks == true) pointsToConsume = 1;
      
    try {
      await hackRateLimit.consume((connectedUsers.get(socket.id)).username, pointsToConsume);
        
      hackPlayer(hackObj, user, victim, socket);
    } catch(rejRes) {
      // Ratelimited
      socket.emit('hackReturn', {error: true, message: `still on cooldown for ${(Math.round(rejRes.msBeforeNext / 60000)) + 1} minute(s)`});
    }
  });

  // Block another player's hack
  socket.on('preventHack', async (code) => {
    if(gameHacks.has(code)){
      gameHacks.set(code, {prevented: true, value: ((gameHacks.get(code)).value), accountedFor: false});
    }
  });

  // New chat sent
  socket.on('chat', async (msgObj) => {
    if(validateUserWithSocket(msgObj.username, socket.id) == false) return;
    
    try {
      await sendChatRateLimit.consume((connectedUsers.get(socket.id)).username);
      
      sendChat(msgObj.username, msgObj.message);
    } catch(rejRes) {
      const chatObj = {
        sender: 'System',
        message: 'Slow down!',
        badgeColor: 'red'
      }
      console.log(rejRes)
      socket.emit('chat', chatObj);
    }
  });

  // Disconnect user
  socket.on('disconnect', function() {
    // Check if user is logged in
    if(connectedUsers.has(socket.id)){
      const username = (connectedUsers.get(socket.id)).username;
      connectedUsers.delete(username);
      connectedUsers.delete(socket.id);

      const index = playersOnline.indexOf(username);
      if(index !== -1){
        playersOnline.splice(index, 1);
      }
    }
  });
});

function validateUserWithSocket(username, socketID){
  if(!(connectedUsers.has(username) && connectedUsers.has(socketID))) return false;
  
  return ((connectedUsers.get(username) === socketID) && ((connectedUsers.get(socketID)).username === username));
}



// CHAT



function sendChat(username, message){
  if ((message.length > 500) || (message.length < 1)) return;
  if (filter.isProfane(message)) return;

  var badgeColor = '#000000';

  if(message.charAt(0) == '/') return doCommand(username, message);

  if(moderators.includes(username)) badgeColor = '#5fbafc';
  if(owners.includes(username)) badgeColor = '#54b382';

  const chatObj = {
    sender: username,
    message: filter.clean(message),
    badgeColor: badgeColor
  }

  io.emit('chat', chatObj);
  if(autoMessage == true) chatCounter++;
}



// Commands
function doCommand(username, msg){
  const command = msg.slice(1).split(' ')[0];
  const arg = msg.slice(1).split(' ')[1];
  
  // Kick a user
  if((command == 'kick') && (moderators.includes(username))){
    const targetUser = arg;
    
    if(connectedUsers.has(targetUser)){
      const targetSocket = connectedUsers.get(targetUser);
      
      io.to(targetSocket).emit('kick');
    }
  }

  // Suspend a user
  if((command == 'suspend') && (moderators.includes(username))){
    const targetUser = arg;
    modifyAccountSuspention(targetUser, true, 'Was suspended by a moderator');
    
    if(connectedUsers.has(targetUser)){
      const targetSocket = connectedUsers.get(targetUser);
      io.to(targetSocket).emit('suspended');
    }
  }

  // Unsuspend a user
  if((command == 'unsuspend') && (moderators.includes(username))){
    const targetUser = arg;
    modifyAccountSuspention(targetUser, false, '');
  }
}



// ACCOUNT MANAGEMENT

const defaultGameStats = {
  money: 0,
  mpc: {cost: 50, amount: 1, value: 0},
  auto: {cost: 200, amount: 0, value: 0},
  triple: {cost: 500, amount: 0, value: 0},
  superAuto: {cost: 10000, amount: 0, value: 0},
  speed: {cost: 500000, unlocked: false, multiplier: 1},
  reset: {minCost: 1000000},
  otherUpgrades: {
    higherHackAmount: false,
    betterFirewall: false,
    covertHacks: false,
    doubleHacks: false
  }
}



async function createAccount(username, password, email){
  // Check account details
  if(username.length > 15) return({error: true, message: 'Username too long!'});
  
  if(username.length < 3) return({error: true, message: 'Username too short!'});
  
  if(!(/^[a-z0-9]+$/i.test(username))) return({error: true, message: 'Username cannot include special characters!'});
  
  if((username.split('')).includes(' ')) return({error: true, message: 'Username cannot include spaces!'});
  
  if(password.length > 25) return({error: true, message: 'Password too long!'});
  
  if(password.length < 6) return({error: true, message: 'Password too short!'});
  
  if(filter.isProfane(username)) return({error: true, message: 'Username cannot contain profanity!'});
  
  if((!username) || (!password)) return({error: true, message: 'Username and password cannot be empty!'});

  // Check for duplicate emails and usernames
  const users = await getUsers();
  var duplicateCheck = {error: false, message: ''};
  
  const emailValidity = await validateEmail(email);

  Object.keys(users).forEach(function(key){
    const userObj = users[key];
    
    if((userObj.email == email) && (emailValidity == true)){
      duplicateCheck = {error: true, message: 'Email is already in use!'};
    }

    if(userObj.username == username){
      duplicateCheck = {error: true, message: 'Username is already in use!'};
    }
  });

  if(duplicateCheck.error == true) return duplicateCheck;
  
  // Generate hash
  const salt = await bcrypt.genSaltSync(3);
  const hash = await bcrypt.hashSync(password, salt);

  // Create suspention status object
  const suspentionStatus = {
    suspended: false,
    reason: ''
  }

  // Set email
  var emailToUse = '';

  if(emailValidity == true){
    emailToUse = email;
  }

  // Create user and login
  await setUser(username, hash, email, defaultGameStats, suspentionStatus);
  return(await login(username, password));
}

async function login(username, password){
  const user = await db.get(username);

  // Check if user exists
  if(!user) return({error: true, message: 'User does not exist!'});

  // Check if user is suspended
  if(user.suspentionStatus.suspended === true) return({error: true, message: 'User is suspended!'});

  // Check if password matches
  const match = await bcrypt.compare(password, user.password);
  if((match === false) || (!password)) return({error: true, message: 'Incorrect username or password!'});

  // Create and return a public user object
  const publicUserObj = {
    username: user.username,
    gameStats: Object.assign(user.gameStats, {
      money: user.gameStats.money,
      auto: user.gameStats.auto,
      mpc: user.gameStats.mpc,
      triple: user.gameStats.triple,
      superAuto: user.gameStats.superAuto,
      speed: user.gameStats.speed,
      reset: user.gameStats.reset,
      otherUpgrades: user.gameStats.otherUpgrades
    })
  }

  return({error: false, message: publicUserObj});
}



// ACCOUNT MODERATION



async function modifyAccountSuspention(username, suspended, reason){
  const userObj = await db.get(username);

  // Create new suspention status object
  const newSuspentionStatus = {
    suspended: suspended,
    reason: reason
  }

  // Apply it to the user
  setUser(userObj.username, userObj.password, userObj.email, userObj.gameStats, newSuspentionStatus);

  // Log the action
  logModeration(`User ${userObj.username}: ${reason}`);
}

function logModeration(item){
  const oldLogs = fs.readFileSync('Logs/ModerationLogs.txt');
  
  fs.writeFileSync('Logs/ModerationLogs.txt', `${oldLogs}${getFormattedDate()} ${item}\n`);
}



// USER UPDATING + CHEAT DETECTION



async function updateUserData(userObj, socket){
  const user = await db.get(userObj.username);
  const newGameStats = userObj.gameStats;
  
  if(user && user.password && (validateUserWithSocket(userObj.username, socket.id))){

    if(userObj.oldStats !== user.gameStats){
      socket.emit('updatedStats', user.gameStats)
      await setUser(user.username, user.password, user.email, user.gameStats, user.suspentionStatus);
    }

    const validityCheck = checkUpdateValidity(userObj.gameStats, user.gameStats, userObj.username);
    
    if((validityCheck.cheating === true) && (serverCheatDetection === true)){
      const message = `Detected attempting to cheat $${validityCheck.details.margin} worth of assets.\nMaximum generated: ${validityCheck.details.maximumGenerated}\nMaximum clicked: ${validityCheck.details.maximumClicked}\nMaximum auto'ed: ${validityCheck.details.maximumAuto}\nMoney hacked: ${validityCheck.details.moneyHacked}\nMinimum spent: ${validityCheck.details.minimumSpent}\nMPC spent: ${validityCheck.details.mpcSpent}\nAutoclicker spent: ${validityCheck.details.autoSpent}\nSuperclicker spent: ${validityCheck.details.superAutoSpent}\nTriple spent: ${validityCheck.details.tripleSpent}`;

      logModeration(`${userObj.username}: ${message}`);
      modifyAccountSuspention(userObj.username, true, message);
      socket.emit('suspended');
    } else {
      socket.emit('updatedStats', newGameStats);
      await setUser(user.username, user.password, user.email, newGameStats, user.suspentionStatus);
    }
  }
}

function checkUpdateValidity(newGameStats, oldGameStats, username){
  // Account for reuglar upgrades
  var autoSpent;
  var mpcSpent;
  var superAutoSpent;
  var tripleSpent;

  if(oldGameStats.reset.minCost == newGameStats.reset.minCost){
    autoSpent = calculateSpent((newGameStats.auto.value - oldGameStats.auto.value), 200, oldGameStats.auto.value, 1.145);
    mpcSpent = calculateSpent((newGameStats.mpc.value - oldGameStats.mpc.value), 50, oldGameStats.mpc.value, 1.1);
    superAutoSpent = calculateSpent((newGameStats.superAuto.value - oldGameStats.superAuto.value), 10000, oldGameStats.superAuto.value, 1.145);
    tripleSpent = calculateSpent((newGameStats.triple.value - oldGameStats.triple.value), 500, oldGameStats.triple.value, 1.145);
  } else {
    autoSpent = calculateSpent((newGameStats.auto.value - oldGameStats.auto.value), 200, 0, 1.145);
    mpcSpent = calculateSpent((newGameStats.mpc.value - oldGameStats.mpc.value), 50, 0, 1.1);
    superAutoSpent = calculateSpent((newGameStats.superAuto.value - oldGameStats.superAuto.value), 10000, 0, 1.145);
    tripleSpent = calculateSpent((newGameStats.triple.value - oldGameStats.triple.value), 500, 0, 1.145);
  }

  var minimumSpent = autoSpent + mpcSpent + superAutoSpent + tripleSpent;

  // Account for other upgrades
  if((newGameStats.otherUpgrades.higherHackAmount == true) && (oldGameStats.otherUpgrades.higherHackAmount == false)) minimumSpent += 1000000;

  if((newGameStats.otherUpgrades.betterFirewall == true) && (oldGameStats.otherUpgrades.betterFirewall == false)) minimumSpent += 1000000;

  if((newGameStats.otherUpgrades.covertHacks == true) && (oldGameStats.otherUpgrades.covertHacks == false)) minimumSpent += 1000000;

  if((newGameStats.otherUpgrades.doubleHacks == true) && (oldGameStats.otherUpgrades.doubleHacks == false)) minimumSpent += 10000000;

  // Account for money hacked
  var moneyHacked = 0;

  if(gameHacks.has(username)){
    const hack = gameHacks.get(username);
    if(hack.accountedFor == false){
      moneyHacked = hack.value;
    }
    gameHacks.delete(username);
  }

  const secondsBetweenUpdate = 30;
  
  const maximumClicked = (newGameStats.mpc.amount * secondsBetweenUpdate * maximumAvgPerSecond);
  const maximumAuto = ((newGameStats.auto.amount + (newGameStats.triple.amount * 3) + (newGameStats.superAuto.amount * newGameStats.mpc.amount)) * secondsBetweenUpdate * newGameStats.speed.multiplier);
  
  const maximumGenerated = maximumClicked + maximumAuto + moneyHacked;
  const totalMax = oldGameStats.money + (maximumGenerated - minimumSpent);

  const cheatingDetected = (newGameStats.money > (totalMax)) && ((newGameStats.money - totalMax) >= stolenThreshold);

  const returnObj = {
    cheating: cheatingDetected,
    details: {
      margin: newGameStats.money - (oldGameStats.money + maximumGenerated - minimumSpent),
      maximumGenerated: maximumGenerated,
      maximumClicked: maximumClicked,
      maximumAuto: maximumAuto,
      moneyHacked: moneyHacked,
      minimumSpent: minimumSpent,
      autoSpent: autoSpent,
      mpcSpent: mpcSpent,
      superAutoSpent: superAutoSpent,
      tripleSpent: tripleSpent
    }
  }
  
  return(returnObj);
}

function calculateSpent(amount, basePrice, beginningAmount, incrementalExponenent){
  var total = 0;
  for (let purchases = 0; purchases < amount; purchases++) {
    total += Math.round(basePrice * (incrementalExponenent ** (beginningAmount + purchases)));
  }
  return(total);
}



// PLAYER HACKING



async function hackPlayer(hackObj, user, victim, socket){
  usersBeingHacked.set(victim.username, true);
  const code = randomFiveDigitCode();

  // Steal correct amount
  var hackValue = Math.round(victim.gameStats.money * 0.1);

  if(user.gameStats.otherUpgrades.higherHackAmount == true) hackValue = Math.round(victim.gameStats.money * 0.15);
  
    
  gameHacks.set(code, {prevented: false, value: hackValue, accountedFor: false});
  io.to(connectedUsers.get(victim.username)).emit('hacked', {code: code, value: (gameHacks.get(code)).value});

  // Find correct firewall time
  var firewallTime = 15000;
  
  if(victim.gameStats.otherUpgrades.betterFirewall == true) firewallTime = 25000;
  
  setTimeout(function(){
    // Make sure that the hack exists
    if(!(gameHacks.has(code))) socket.emit('hackReturn', {error: true, message: 'an internal error occured'});
    
    const hack = gameHacks.get(code);
      
    if(hack.prevented == true){
      socket.emit('hackReturn', {error: true, message: 'hack was blocked by victim'});
      setTimeout(function(){
        usersBeingHacked.delete(victim.username);
      }, 5000);

      // Send a chat message if the hacker does not have covert hacks
      if(user.gameStats.otherUpgrades.covertHacks == false){
        const chatObj = {
          sender: 'Game',
          message: `${hackObj.hacker.username} has tried to hack ${hackObj.victim}, but was blocked.`,
          badgeColor: 'red'
        }
        
        io.emit('chat', chatObj);
      }
    } else {
      // Send a chat message if the hacker does not have covert hacks
      if(user.gameStats.otherUpgrades.covertHacks == false){
        const chatObj = {
          sender: 'Game',
          message: `${hackObj.hacker.username} has successfully hacked $${formatNumber(hack.value)} from ${hackObj.victim}!`,
          badgeColor: 'red'
        }
        
        io.emit('chat', chatObj);
      }
      
      // Update victim's hack value
      io.to(connectedUsers.get(hackObj.victim)).emit('lostHack', hack.value);
      if(gameHacks.has(victim.username)){
        const oldVictimHackValue = gameHacks.get(victim.username);
                      
        gameHacks.set(victim.username, {prevented: false, value: (oldVictimHackValue - hack.value), accountedFor: false});
      } else {
        gameHacks.set(victim.username, {prevented: false, value: hack.value, accountedFor: false});
      }
      
      // Update hacker's hack value
      if(gameHacks.has(user.username)){
        const oldHackerHackValue = gameHacks.get(user.username);
                      
        gameHacks.set(user.username, {prevented: oldHackerHackValue.prevented, value: (oldHackerHackValue.value + hack.value), accountedFor: oldHackerHackValue.accountedFor});
      } else {
        gameHacks.set(user.username, gameHacks.get(code));
      }
                    
      gameHacks.delete(code);
      socket.emit('hackReturn', {error: false, message: hack.value});
      setTimeout(function(){
        usersBeingHacked.delete(victim.username);
      }, 5000);
    }
  }, firewallTime);
}



// LEADERBOARD



async function fullLeaderboardUpdate(){
  var users = await getUsers();
  var topUsers = [];
  
  Object.keys(users).forEach(function(key){
    const user = users[key];
    const userObj = {
      username: user.username,
      money: (user.gameStats || defaultGameStats).money
    }
    
    if(user.suspentionStatus.suspended === false){
      if(topUsers.length < 10){
        topUsers.push(userObj);
        topUsers.sort(function(a, b) {
          return(b.money - a.money);
        });
      } else if((user.gameStats || defaultGameStats).money > topUsers[9].money){
        topUsers[9] = userObj;
        topUsers.sort(function(a, b) {
          return(b.money - a.money);
        });
      }
    }
  });

  for(let user of topUsers){
    if(connectedUsers.has(user.username)){
      // User is online
    }
  }
  
  leaderboard = topUsers;
  io.emit('leaderboardUpdate', leaderboard);
}

setInterval(function(){
  fullLeaderboardUpdate();
}, 30000);



// MISC. FUNCTIONS



async function validateEmail(email){
  const {wellFormed, validDomain, validMailbox} = await emailValidator.verify(email);
  if((wellFormed === true) && (validDomain === true)){
    return(true);
  } else {
    return(false);
  }
}

function getFormattedDate() {
  var date = new Date();
  return(date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
}

function randomFiveDigitCode(){
  return(Math.floor(Math.random() * 90000) + 10000);
}

function getThreeOnlinePlayers(){
  const shuffledPlayers = playersOnline.sort(() => 0.5 - Math.random());
  var randomPlayers = shuffledPlayers.slice(0, 3);

  while(randomPlayers.length < 3){
    randomPlayers.push('Nobody online!');
  }

  return randomPlayers;
}

function formatNumber(number){
  if(number){
    return(number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  } else {
    return(number);
  }
}



// DISCORD WEBHOOK



process.on('unhandledRejection', (e) => {
  fetch(process.env.WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "content": null,
      "embeds": [
        {
          "title": "Bug report",
          "description": "Oh no! A bug has ocurred on the stable branch ([https://cyberheistio-dev.catr3kd.repl.co/](https://cyberheistio-dev.catr3kd.repl.co/)) which has caused a fatal issue. The bug has been detailed below.\n\n\`\`\`js\n" + e.stack + "\n\`\`\`\n" + getFormattedDate(),
          "color": null,
          "author": {
            "name": "CyberHeist.IO Server",
            "icon_url": "https://cyberheistio.catr3kd.repl.co/Assets/favicon.jpg"
          }
        }
      ],
      "attachments": []
    })
  })
})