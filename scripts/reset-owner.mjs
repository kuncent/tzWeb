#!/usr/bin/env node
/* ============================================================
 * owner 密码重置 CLI：node scripts/reset-owner.mjs <新密码>
 * ------------------------------------------------------------
 * 直接读写 server/data/users.json，无需启动服务端。
 * 场景：忘记 owner 口令、开发时快速重置。
 * ============================================================ */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(process.env.ADMIN_DATA_DIR || path.join(HERE, '..', 'server', 'data'))
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const N = 16384, r = 8, p = 1, keylen = 32
  const hash = crypto.scryptSync(pw, salt, keylen, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`
}

const pw = process.argv[2]
if (!pw || pw.length < 8) {
  console.error('用法: node scripts/reset-owner.mjs <新密码（至少8位）>')
  process.exit(1)
}

let users
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
} catch {
  console.error(`无法读取 ${USERS_FILE}`)
  process.exit(1)
}

const owner = users.find((u) => u.role === 'owner')
if (!owner) {
  console.error('users.json 中未找到 owner 角色账号')
  process.exit(1)
}

owner.hash = hashPassword(pw)
owner.tv = (owner.tv || 0) + 1 // 吊销所有已有会话

const tmp = USERS_FILE + '.tmp'
fs.writeFileSync(tmp, JSON.stringify(users, null, 2))
fs.renameSync(tmp, USERS_FILE)

console.log(`✓ owner「${owner.email}」密码已重置，所有旧会话已吊销。`)
