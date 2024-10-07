/*

  todo:
    * recognize aliases
    * recognize closing tags
    * Add attribute to indicate broken words

*/

import { hasValue, trimArray } from "./utilities.js"

const reDirectiveSpec = /{([^:}]*)(:\s*?)?(.*?)}/gi,
  reSplitSentenceToTerms = /(.*?)(\[.*?])/gi

class EmptyLine { }

class Directive {
  constructor(source) {
    if (!source) return

    this.Source = source
    let split = source.split(reDirectiveSpec).filter(hasValue)
      ;[this.Type, , this.Detail] = split.filter(hasValue).map(x => x.toString().trim())
  }
}

class Comment extends Directive { }

class ChordInfo {
  constructor(source) {

    const reOutput = /\[([^\:\]]*):?(.*)?\]/.exec(source)

    if (reOutput) {
      this.Source = reOutput.shift()

      this.Symbol = reOutput.shift().replace(":", "")
      this.Comment = reOutput.join(" ")
    }
    else {
      this.Source = ""
      this.Symbol = ""
      this.Comment = ""
    }
  }
}

class Phrase {
  constructor(chord, text) {
    this.Chord = chord
    this.Text = text
  }
}

class Sentence {
  constructor(source) {
    source = source.toString()
    this.Source = source
    this.Phrases = []


    var connectedChordsPlaceholder = "&nbsp;",
      content = source
        .replace(/\]\s*\[/gi, `]${connectedChordsPlaceholder}[`)
    content = content.split(reSplitSentenceToTerms)
      .map(x => x.trim())

    // trim edges of array
    // ensure chord is first token and text is last token
    // convert tokens to phrases
    // ensure proper pattern of chord,text,chord,text...
    content = trimArray(content).filter(x => x != "")

    if (content[0].indexOf("[") != 0) {
      content.unshift("[]")
    }

    while (content.length > 0) {
      var [chord, text] = content
      if (chord === undefined) chord = ""
      if (text === undefined) text = ""
      if (text === connectedChordsPlaceholder) text = ""

      this.Phrases.push(new Phrase(new ChordInfo(chord), text))
      content.shift()
      content.shift()
    }
  }
}

class Lyric extends Directive {
  constructor(type) {
    super()
    this.Type = type
    this.Sentences = []
  }
}

class Song {
  constructor() {
    Object.assign(this, {
      Title: "",
      Artist: "",
      Copyright: "",
      Key: "",
      License: "",

      Comments: [],
      Directives: []
    })
  }

  FilterDirectivesByType(type) {
    return this.Directives.filter(
      p => p.Type.toLowerCase() == type.toLowerCase()
    )
  }

  get Verses() {
    return this.FilterDirectivesByType("verse")
  }

  get Chorii() {
    return this.FillterDirectivesByType("chorus")
  }

  get Choruses() {
    return this.Chorii
  }
}


const splitToLines = songText => {
  let split = songText.toString()


  split = split.replace(/[\r\n]+/gim, "\\r")
  split = split.split("\\r")

  // split = split.replace(/[\r\n]/gim, "\r")
  // split = split.split("\r")
  split = split.map(l => l.trim())

  return split
}

// determine type, return instance of types
//	* directive
//	* comment
//	* empty
//	* lyric
// return a class based on type
const preParseLine = line => {
  line = line && line.trim()
  if (!line || line === "") return new EmptyLine()
  if (line.startsWith("#")) return new Comment(line)
  if (line.startsWith("{")) return new Directive(line)
  return new Sentence(line)
}

class SongParser {
  constructor(songText) {
    this.Source = songText
  }

  Parse = function () {
    let song = new Song()
    let currentDirective = null
    let lines = splitToLines(this.Source).map(preParseLine)

    function StartNextDirective(next) {
      if (currentDirective) {
        song.Directives.push(currentDirective)
      }
      currentDirective = next
    }

    while (lines.length > 0) {
      var line = lines.shift()
      switch (true) {
        case line instanceof EmptyLine:
          StartNextDirective(null)
          break

        case line instanceof Comment:
          // this psace intentionally left blank
          break

        case line instanceof Directive:
          // check for known metadata
          //  title, artist...
          switch (line.Type.toLowerCase()) {
            case "title":
              song.Title = line.Detail
              break

            case "artist":
              song.Artist = line.Detail
              break

            case "key":
              song.Key = line.Detail
              break

            case "copyright":
              song.Copyright = line.Detail
              break

            case "license":
              song.License = line.Detail
              break

            case "comment":
              song.Comments.push(line.Detail)
              break

            default:
              if (lines[0] instanceof Sentence) {
                line = new Lyric(line.Type)
              }
              StartNextDirective(line)
              break
          }
          break

        case line instanceof Sentence:
          if (!currentDirective || !(currentDirective instanceof Lyric)) {
            StartNextDirective(new Lyric("Verse"))
          }
          currentDirective.Sentences.push(line)
          break
      }
    }

    StartNextDirective()
    return song
  }
}

function isLyric(l) {
  if (l instanceof Lyric) return true
  return !!(l.Sentences && l.Sentences.length)
}

const ParseSong = songText => {
  const parser = new SongParser(songText)
  return parser.Parse()
}

export default ParseSong
export { ParseSong, SongParser, Lyric, isLyric }
