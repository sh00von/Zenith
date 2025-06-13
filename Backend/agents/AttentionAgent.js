// agents/AttentionAgent.js

/**
 * A near-exhaustive English stop-word list.
 * Source: NLTK stopwords + a few contractions & variants.
 */
const STOP_WORDS = new Set([
    'a','about','above','after','again','against','all','am','an','and','any','are',"aren't",
    'as','at','be','because','been','before','being','below','between','both','but','by',
    'can','cannot','could',"couldn’t",'did',"didn't",'do','does',"doesn't",'doing',"don't",
    'down','during','each','few','for','from','further','had',"hadn't",'has',"hasn't",'have',
    "haven't",'having','he','her','here','hers','herself','him','himself','his','how','i',
    "i'd","i'll","i'm","i've",'if','in','into','is',"isn't",'it',"it's",'its','itself','let',
    "let's",'me','more','most',"mustn't",'my','myself','no','nor','not','of','off','on','once',
    'only','or','other','ought','our','ours','ourselves','out','over','own','same',"shan't",
    'she',"she'd","she'll","she's",'should',"shouldn't",'so','some','such','than','that',
    "that's",'the','their','theirs','them','themselves','then','there','these','they',
    "they'd","they'll","they're","they've",'this','those','through','to','too','under','until',
    'up','very','was',"wasn't",'we',"we'd","we'll","we're","we've",'were',"weren't",'what',
    "what's",'when',"when's",'where',"where's",'which','while','who',"who's",'whom','why',
    "why's",'with',"won't",'would',"wouldn't",'you',"you'd","you'll","you're","you've",'your',
    'yours','yourself','yourselves'
  ]);
  
  export class AttentionAgent {
    /**
     * Split text into lowercase word tokens, remove punctuation/non-word chars,
     * and filter out stop-words.
     *
     * @param {string} text
     * @returns {string[]} filtered tokens
     */
    filterTokens(text) {
      const tokens = text
        .split(/\W+/)
        .filter(Boolean)
        .map(t => t.toLowerCase())
        .filter(t => !STOP_WORDS.has(t));
      console.log(`Attention ▶️ [${tokens.join(', ')}]`);
      return tokens;
    }
  }
  