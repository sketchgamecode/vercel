import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const root = process.cwd();
  try {
    const content = fs.readFileSync(path.join(root, 'config', 'weapon-bases.json'), 'utf8');
    res.status(200).setHeader('Content-Type', 'application/json').end(content);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
