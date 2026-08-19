// Real, free, offline text-to-speech via espeak-ng (apt package, already
// present on GitHub-hosted Actions runners after `apt-get install
// espeak-ng`, zero API cost). Produces a real WAV file used as the video's
// voiceover track — not a stub.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function synthesizeVoiceover(text: string, outWavPath: string): Promise<void> {
  const clean = text.replace(/[\r\n]+/g, ' ').trim()
  if (!clean) throw new Error('Voiceover script is empty')
  await execFileAsync('espeak-ng', [
    '-v',
    'it', // Italian voice — matches the unit's operating language
    '-s',
    '165', // words per minute
    '-p',
    '45', // pitch, slightly warmer than default robotic monotone
    '-w',
    outWavPath,
    clean,
  ])
}
