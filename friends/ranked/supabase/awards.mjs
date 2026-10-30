/**
 * Pure, deterministic end-of-game awards. Imported by the Supabase function.
 * Each award is derived from submitted rankings, not from a subjective AI judgement.
 * Historical games with incomplete round history receive no invented awards.
 */
export function buildAwards(rounds, scores, mode) {
  const expected = mode === 'both' ? 50 : 25;
  const valid = Array.isArray(rounds) && rounds.length === expected &&
    rounds.every(r => r && (r.status === 'scored' || r.status === 'skipped') &&
      (r.game === 'alex' || r.game === 'doron') && Number.isInteger(r.questionIndex));
  const keys = valid ? new Set(rounds.map(r => r.game + ':' + r.questionIndex)) : new Set();
  if (!valid || keys.size !== expected) {
    return { complete:false, cards:[], note:'This match does not have a complete question-by-question archive, so awards cannot be determined reliably.' };
  }
  const names = Object.keys(scores || {}).sort((a,b)=>a.localeCompare(b));
  const eligible = rounds.filter(r => r.status === 'scored' && r.votes > 0 && Array.isArray(r.results));
  const options = eligible.flatMap(r => r.results.map(a => ({...a, game:r.game, question:r.question, number:r.number, questionIndex:r.questionIndex})));
  const positive = options.filter(a => Number(a.sum) > 0);
  const sortedOptions = (items, compare) => [...items].sort(compare || ((a,b)=>b.sum-a.sum || b.first-a.first || String(a.author).localeCompare(String(b.author))));
  const cards = [];
  if (positive.length) {
    const favorite = sortedOptions(positive,(a,b)=>b.first-a.first || b.sum-a.sum || a.game.localeCompare(b.game) || a.questionIndex-b.questionIndex || a.author.localeCompare(b.author))[0];
    if (favorite.first>0) cards.push({
      id:'crowd-favorite',icon:'heart',title:'Crowd Favorite',winner:favorite.author,
      stat:favorite.first+' first-place votes',detail:'Most first-place votes received by one answer.',
      answer:favorite.answer,question:favorite.question,game:favorite.game,number:favorite.number
    });
    const biggest=sortedOptions(positive)[0];
    cards.push({
      id:'top-answer',icon:'zap',title:'Biggest Hit',winner:biggest.author,
      stat:biggest.sum+' points',detail:'Highest-scoring individual answer in the match.',
      answer:biggest.answer,question:biggest.question,game:biggest.game,number:biggest.number
    });
  }
  const firstTotals = new Map(names.map(name=>[name,0]));
  for(const o of options) firstTotals.set(o.author,(firstTotals.get(o.author)||0)+Number(o.first||0));
  const firstWinner = [...firstTotals.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
  if(firstWinner && firstWinner[1]>0) cards.push({
    id:'first-place-magnet',icon:'medal',title:'First-Place Magnet',winner:firstWinner[0],
    stat:firstWinner[1]+' first-place votes',detail:'Most first-place votes received across all of their answers.'
  });
  const authored = names.map(name=>{
    const entries=options.filter(x=>x.author===name);
    const hits=entries.filter(x=>x.sum>0).length;
    const points=entries.reduce((v,x)=>v+Number(x.sum),0);
    return {name,hits,rounds:entries.length,points,rate:entries.length?hits/entries.length:0};
  }).filter(x=>x.rounds>=5);
  if(authored.length) {
    const consistent=authored.sort((a,b)=>b.rate-a.rate||b.hits-a.hits||b.points-a.points||a.name.localeCompare(b.name))[0];
    if(consistent.hits>0) cards.push({
      id:'most-consistent',icon:'target',title:'Consistency Crown',winner:consistent.name,
      stat:consistent.hits+'/'+consistent.rounds+' scoring rounds',detail:'Highest share of rounds earning at least one point (minimum five eligible rounds).'
    });
  }
  // Track the position of every author after each scored round, using the existing
  // total-points and first-place-vote tiebreak rules.
  const running=Object.fromEntries(names.map(n=>[n,{sum:0,first:0}]));
  const standings=()=>{
    const list=[...names].sort((a,b)=>running[b].sum-running[a].sum||running[b].first-running[a].first||a.localeCompare(b));
    return Object.fromEntries(list.map((name,i)=>[name,i+1]));
  };
  let completed=0,bestJump=null,bestUpset=null;
  for(const round of rounds){
    if(round.status !== 'scored' || !Array.isArray(round.results))continue;
    const before=standings();
    const leaderBefore=Math.max(0,...names.map(name=>running[name].sum));
    if(completed>=3 && round.votes>0){
      const bottomHalf=Math.floor(names.length/2)+1;
      const candidates=round.results.filter(x=>x.rank===1 && x.sum>0 && before[x.author]>=bottomHalf);
      for(const a of candidates){
        const gap=leaderBefore-running[a.author].sum;
        const candidate={author:a.author,sum:a.sum,gap,beforeRank:before[a.author],answer:a.answer,question:round.question,number:round.number,game:round.game};
        if(!bestUpset||candidate.sum>bestUpset.sum||(candidate.sum===bestUpset.sum && candidate.gap>bestUpset.gap))bestUpset=candidate;
      }
    }
    for(const o of round.results){
      if(!running[o.author])continue;
      running[o.author].sum+=Number(o.sum||0);running[o.author].first+=Number(o.first||0);
    }
    const after=standings();
    if(completed>=2 && round.votes>0){
      for(const author of names){
        const improvement=before[author]-after[author];
        const earned=round.results.find(x=>x.author===author)?.sum||0;
        if(improvement>0 && (!bestJump||improvement>bestJump.improvement||(improvement===bestJump.improvement&&earned>bestJump.points))) {
          bestJump={author,improvement,points:earned,number:round.number,game:round.game,question:round.question,from:before[author],to:after[author]};
        }
      }
    }
    if(round.votes>0)completed++;
  }
  if(bestJump)cards.push({
    id:'biggest-comeback',icon:'trending-up',title:'Biggest Comeback',winner:bestJump.author,
    stat:'Up '+bestJump.improvement+' places',detail:'Largest single-round rise in the cumulative leaderboard, from #'+bestJump.from+' to #'+bestJump.to+'.',
    question:bestJump.question,game:bestJump.game,number:bestJump.number
  });
  if(bestUpset)cards.push({
    id:'underdog',icon:'flame',title:'Underdog Moment',winner:bestUpset.author,
    stat:bestUpset.sum+' points from #'+bestUpset.beforeRank,detail:'A bottom-half author won a question after at least three scored rounds.',
    answer:bestUpset.answer,question:bestUpset.question,game:bestUpset.game,number:bestUpset.number
  });
  return {complete:true,cards,note:cards.length?'':'No votes were recorded, so no competitive awards could be determined.'};
}
