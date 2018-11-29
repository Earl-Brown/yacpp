import { Lyric } from "./chordpro-parser.js"
import { log } from "./utilities.js"

function compareChords(chordsA, chordsB) {
  if (chordsA && !chordsB) return false
  if (!chordsA && chordsB) return false
  if (chordsA.length != chordsB.length) return false
  for (let i = 0; i < chordsA.length; i++) {
    if (chordsA[i] != chordsB[i]) return false
  }

  return true
}

function getChordsFromLyric(lyric) {
  let chords = lyric.Sentences.map(s => s.Phrases.map(c => c.Chord.Symbol).join("")).join("")
  return chords
}

class CompressedChordInfo {
  constructor(chordInfo) {
    this.Symbol = chordInfo.Symbol
    this.Comment = [chordInfo.Comment]
  }
}

class CompressedPhrase {
  constructor(phrase) {
    this.Chord = new CompressedChordInfo(phrase.Chord)
    this.Text = [phrase.Text]
  }
}

class CompressedSentence {
  constructor(phrases) {
    this.Phrases = phrases.map(p => new CompressedPhrase(p))
  }

  add(sentence) {
    if (sentence.Phrases.length != this.Phrases.length) {
			throw `
attempt to mege incompatible sentences: 
  ${JSON.stringify(sentence.Phrases.map(p => `[${p.Chord.Symbol}]${p.Text}`), undefined, 2)}
and 
  ${JSON.stringify(this.Phrases.map(p => `[${p.Chord.Symbol}]${p.Text}`), undefined, 2)}
`
		}

    for (let i = 0; i < sentence.Phrases.length; i++) {
      let phrase = sentence.Phrases[i]
      this.Phrases[i].Text.push(phrase.Text)
    }
  }
}

class CompressedLyric extends Lyric {
  constructor(lyric) {
    super()
    this.Type = `${lyric.Type}`

    this.Sentences = lyric.Sentences.map(s => new CompressedSentence(s.Phrases))
  }

  add(lyric) {
    if (lyric.Sentences.length != this.Sentences.length) {
			throw `
attempt to merge incompatible lyrics
	${JSON.stringify(lyric.Sentences.map(s => s.Source), undefined, 2)}
and
  ${JSON.stringify(this.Sentences.map(s => s.Source), undefined, 2)}	
			`
		}

    let lyricSentences = lyric.Sentences

    for (let i = 0; i < lyricSentences.length; i++) {
      this.Sentences[i].add(lyricSentences[i])
    }
  }
}

class CompressedSong {
  constructor(baseSong) {
    Object.assign(this, baseSong)
  }

  get Verses() {
    return this.FilterDirectivesByType("Verse")
  }

  get Chorii() {
    return this.FilterDirectivesByType("Chorus")
  }

  get Choruses() {
    return this.Chorii
  }
}

function doChordsMatch(l1, l2) {
  let c1 = getChordsFromLyric(l1),
    c2 = getChordsFromLyric(l2)

  return compareChords(c1, c2)
}

class SongCompressor {
  Compress(song) {
    let compressedLyrics = {}
    let nonLyrics = song.Directives.filter(d => !d.Sentences || d.Sentences.length < 1)
    let lyrics = song.Directives.filter(d => d.Sentences && d.Sentences.length > 0)
    for (let idx in lyrics) {
      let l = lyrics[idx],
        _type = l.Type

      if (!compressedLyrics[_type]) {
        compressedLyrics[_type] = new CompressedLyric(l)
      } else {
        compressedLyrics[_type].add(l)
      }
    }

    let arrayOfCompressedLyrics = Object.getOwnPropertyNames(compressedLyrics)
      .map(n => compressedLyrics[n])
    let compressedSong = new CompressedSong(song)
    compressedSong.Directives = [].concat(arrayOfCompressedLyrics).concat(nonLyrics)
    return compressedSong
  }
}

export default SongCompressor
