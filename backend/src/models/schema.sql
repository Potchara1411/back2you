-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,       -- must be @kaist.ac.kr
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',          -- 'user' or 'admin'
  is_blocked BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(10),
  otp_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL,                -- 'lost' or 'found'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT REFERENCES categories(id),
  location VARCHAR(255),
  date_occurred DATE,
  status VARCHAR(50) DEFAULT 'open',        -- open, hidden, claimed, pending_resolution, resolved
  images TEXT[],                            -- array of image URLs (max 3)
  is_archived BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reported posts table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  reported_by INT REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Claim requests table
CREATE TABLE IF NOT EXISTS claim_requests (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  claimant_user_id INT REFERENCES users(id) ON DELETE CASCADE,
  claimant_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  details TEXT,
  found_location VARCHAR(255),
  found_date TIMESTAMP,
  proof_images TEXT[],
  status VARCHAR(50) DEFAULT 'pending',    -- pending, accepted, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
