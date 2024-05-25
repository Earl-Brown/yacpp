import { parse, transpose, prettyPrint } from 'chord-magic'
import { isLyric } from './chordpro-parser.js'

const CONSTANTS = {
	Sharps: ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"],
	Flats: ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"]
}
function transposeChordSymbol(symbol, numberOfSemitones, options = {}) {
	if (!symbol) return symbol

	let parsed = parse(symbol)
	let transposed = transpose(parsed, Number(numberOfSemitones))
	let output = prettyPrint(transposed, options.prettyPrint || {})

	return output
}

function transposeChord(c, numberOfSemitones, options) {
	let output = {...c, Symbol: transposeChordSymbol(c.Symbol, numberOfSemitones, options)}
	return output
}

function transposePhrase(p, numberOfSemitones, options) {
	let output = {...p, Chord: transposeChord(p.Chord, numberOfSemitones, options) }
	return output
}

function transposeSentence(s, numberOfSemitones, options) {
	let output = {...s, Phrases: s.Phrases.map(p => transposePhrase(p, numberOfSemitones, options))}

	return output
}

function transposeLyric(l, numberOfSemitones, options) {
	let output = {...l, Sentences: l.Sentences.map(s => transposeSentence(s, numberOfSemitones, options))}
	return output
}

function transposeDirective(d, numberOfSemitones, options) {
	if (isLyric(d)) return transposeLyric(d, numberOfSemitones, options)

	return d
}

class SongTransposer {
	CONSTANTS = CONSTANTS
  constructor(song, configuration = {}) {
		this.Song = song
		this.Configuration = this.setConfiguration(configuration)
	}

	setConfiguration(config) {
		this.configuration = {
			trasnposition: {},
			prettyPrint: {naming: (CONSTANTS[config.SemitoneType] || undefined)}
		}

	}

	Transpose(numberOfSemitones) {
		let {Song: song} = this

		let output = {...song,
			Key: (song.Key ? transposeChordSymbol(song.Key, numberOfSemitones, this.configuration) : ""),
			Directives: song.Directives.map(d => transposeDirective(d, numberOfSemitones, this.configuration))
		}
		return output
	}
}

export default SongTransposer
