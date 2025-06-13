// utils/bm25Index.js
import elasticlunr from 'elasticlunr';

export function buildBM25(docs) {
  const idx = elasticlunr(function () {
    this.addField('text');
    this.setRef('ee_code');
  });
  docs.forEach(doc => idx.addDoc({ ee_code: doc.ee_code, text: doc.text }));
  return idx;
}
