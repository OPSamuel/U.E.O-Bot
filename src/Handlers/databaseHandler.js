const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'Data', 'profiles.db');

if (!fs.existsSync(path.join(__dirname, '..', 'Data'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'Data'));
}

const db = new sqlite3.Database(dbPath);

const plots = [
  { id: 1, name: 'Plot 1', row: 1, col: 1, multiplier: 3, cost: 1000000000000, ownedByDefault: false },
  { id: 2, name: 'Plot 2', row: 1, col: 2, multiplier: 5, cost: 99000000000000, ownedByDefault: false },
  { id: 3, name: 'Plot 3', row: 1, col: 3, multiplier: 3, cost: 100000000000, ownedByDefault: false },
  { id: 4, name: 'Plot 4', row: 2, col: 1, multiplier: 2, cost: 500000000, ownedByDefault: false },
  { id: 5, name: 'Plot 5', row: 2, col: 2, multiplier: 2, cost: 100000000, ownedByDefault: false },
  { id: 6, name: 'Plot 6', row: 2, col: 3, multiplier: 2, cost: 2500000, ownedByDefault: false },
  { id: 7, name: 'Plot 7', row: 3, col: 1, multiplier: 1, cost: 500000, ownedByDefault: false },
  { id: 8, name: 'Plot 8', row: 3, col: 2, multiplier: 1, cost: 50000, ownedByDefault: false },
  { id: 9, name: 'Plot 9', row: 3, col: 3, multiplier: 1, cost: 150000, ownedByDefault: false },
  { id: 10, name: 'Plot 10', row: 4, col: 1, multiplier: 1, cost: 20000, ownedByDefault: false },
  { id: 11, name: 'Plot 11', row: 4, col: 2, multiplier: 1, cost: 0, ownedByDefault: true, isEntrance: true },
  { id: 12, name: 'Plot 12', row: 4, col: 3, multiplier: 1, cost: 5000, ownedByDefault: false }
];

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      userId TEXT PRIMARY KEY,
      username TEXT,
      cash REAL DEFAULT 0,
      cash_boost INTEGER DEFAULT 100,
      offline_gas_boost INTEGER DEFAULT 100,
      base_gas_per_second REAL DEFAULT 0,
      unlocked_plots TEXT DEFAULT '[11]',
      created_at INTEGER,
      updated_at INTEGER
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS area_allocations (
      userId TEXT PRIMARY KEY,
      plot1 REAL DEFAULT 0,
      plot2 REAL DEFAULT 0,
      plot3 REAL DEFAULT 0,
      plot4 REAL DEFAULT 0,
      plot5 REAL DEFAULT 0,
      plot6 REAL DEFAULT 0,
      plot7 REAL DEFAULT 0,
      plot8 REAL DEFAULT 0,
      plot9 REAL DEFAULT 0,
      plot10 REAL DEFAULT 0,
      plot11 REAL DEFAULT 0,
      plot12 REAL DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES profiles(userId)
    )
  `);
});

function getProfile(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM profiles WHERE userId = ?', [userId], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

function getAreaAllocation(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM area_allocations WHERE userId = ?', [userId], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

function getUnlockedPlots(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT unlocked_plots FROM profiles WHERE userId = ?', [userId], (err, row) => {
      if (err) reject(err);
      
      let unlockedPlotIds = [11];
      
      if (row && row.unlocked_plots) {
        try {
          unlockedPlotIds = JSON.parse(row.unlocked_plots);
        } catch (e) {
          unlockedPlotIds = [11];
        }
      }
      
      const unlockedPlots = plots.filter(plot => unlockedPlotIds.includes(plot.id));
      
      for (const plot of unlockedPlots) {
        plot.allocated = 0;
      }
      
      resolve(unlockedPlots);
    });
  });
}

function createOrUpdateProfile(userId, username, data) {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    
    db.get('SELECT * FROM profiles WHERE userId = ?', [userId], (err, row) => {
      if (err) reject(err);
      
      if (row) {
        db.run(`
          UPDATE profiles 
          SET username = ?, 
              cash = COALESCE(?, cash),
              cash_boost = COALESCE(?, cash_boost),
              offline_gas_boost = COALESCE(?, offline_gas_boost),
              base_gas_per_second = COALESCE(?, base_gas_per_second),
              updated_at = ?
          WHERE userId = ?
        `, [
          username, 
          data.cash,
          data.cash_boost, 
          data.offline_gas_boost, 
          data.base_gas_per_second,
          now, 
          userId
        ], (err) => {
          if (err) reject(err);
          
          db.run(`
            INSERT OR IGNORE INTO area_allocations (userId) VALUES (?)
          `, [userId], (err) => {
            if (err) reject(err);
            resolve(true);
          });
        });
      } else {
        db.run(`
          INSERT INTO profiles (userId, username, cash, cash_boost, offline_gas_boost, base_gas_per_second, unlocked_plots, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 
          username, 
          data.cash || 0,
          data.cash_boost || 100, 
          data.offline_gas_boost || 100, 
          data.base_gas_per_second || 0,
          JSON.stringify([11]),
          now, 
          now
        ], (err) => {
          if (err) reject(err);
          
          db.run(`
            INSERT OR IGNORE INTO area_allocations (userId) VALUES (?)
          `, [userId], (err) => {
            if (err) reject(err);
            resolve(true);
          });
        });
      }
    });
  });
}

function updateProfile(userId, data) {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const updates = [];
    const values = [];
    
    if (data.cash !== undefined) {
      updates.push('cash = ?');
      values.push(data.cash);
    }
    if (data.cash_boost !== undefined) {
      updates.push('cash_boost = ?');
      values.push(data.cash_boost);
    }
    if (data.offline_gas_boost !== undefined) {
      updates.push('offline_gas_boost = ?');
      values.push(data.offline_gas_boost);
    }
    if (data.base_gas_per_second !== undefined) {
      updates.push('base_gas_per_second = ?');
      values.push(data.base_gas_per_second);
    }
    
    if (updates.length === 0) {
      resolve(false);
      return;
    }
    
    updates.push('updated_at = ?');
    values.push(now);
    values.push(userId);
    
    db.run(`UPDATE profiles SET ${updates.join(', ')} WHERE userId = ?`, values, (err) => {
      if (err) reject(err);
      resolve(true);
    });
  });
}

function updateAreaAllocation(userId, allocations) {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO area_allocations (userId, plot1, plot2, plot3, plot4, plot5, plot6, plot7, plot8, plot9, plot10, plot11, plot12)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, 
      allocations.plot1 || 0,
      allocations.plot2 || 0,
      allocations.plot3 || 0,
      allocations.plot4 || 0,
      allocations.plot5 || 0,
      allocations.plot6 || 0,
      allocations.plot7 || 0,
      allocations.plot8 || 0,
      allocations.plot9 || 0,
      allocations.plot10 || 0,
      allocations.plot11 || 0,
      allocations.plot12 || 0
    ], (err) => {
      if (err) reject(err);
      resolve(true);
    });
  });
}

function setPlotAllocation(userId, plotId, amount) {
  return new Promise((resolve, reject) => {
    const column = `plot${plotId}`;
    db.run(`INSERT INTO area_allocations (userId, ${column}) 
            VALUES (?, ?) 
            ON CONFLICT(userId) DO UPDATE SET ${column} = excluded.${column}`,
            [userId, amount], (err) => {
      if (err) reject(err);
      resolve(true);
    });
  });
}

function unlockPlot(userId, plotId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT unlocked_plots FROM profiles WHERE userId = ?', [userId], (err, row) => {
      if (err) reject(err);
      
      let unlockedPlots = [11];
      if (row && row.unlocked_plots) {
        try {
          unlockedPlots = JSON.parse(row.unlocked_plots);
        } catch (e) {
          unlockedPlots = [11];
        }
      }
      
      if (!unlockedPlots.includes(plotId)) {
        unlockedPlots.push(plotId);
      }
      
      db.run('UPDATE profiles SET unlocked_plots = ? WHERE userId = ?', [JSON.stringify(unlockedPlots), userId], (err) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  });
}

function calculateEffectiveGasPerSecond(allocations) {
  if (!allocations) return 0;
  
  let total = 0;
  for (const plot of plots) {
    const allocation = allocations[`plot${plot.id}`] || 0;
    total += allocation * plot.multiplier;
  }
  return total;
}

function getAllProfiles() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM profiles ORDER BY username', (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  plots,
  getProfile,
  getAreaAllocation,
  getUnlockedPlots,
  createOrUpdateProfile,
  updateProfile,
  updateAreaAllocation,
  setPlotAllocation,
  unlockPlot,
  calculateEffectiveGasPerSecond,
  getAllProfiles
};