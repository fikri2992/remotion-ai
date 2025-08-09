import { ExplainCodeAgent } from '../src/mastra/agents/explain-code-agent';

async function testExplainAgent() {
  console.log('Testing ExplainCodeAgent...');
  
  const agent = new ExplainCodeAgent();
  
  try {
    const result = await agent.explain({
      problemText: 'Find the longest substring without repeating characters',
      codeSnippet: `
function lengthOfLongestSubstring(s) {
  const set = new Set();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left++]);
    }
    set.add(s[right]);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
      examples: ['abcabcbb', 'bbbbb', 'pwwkew'],
    });
    
    console.log('✅ ExplainCodeAgent test passed');
    console.log('Narration sections:', result.narration.sections.length);
    console.log('Visual scenes:', result.visualSpec.scenes.length);
    console.log('Recommended composition:', result.recommendedComposition);
    
    return true;
  } catch (error) {
    console.error('❌ ExplainCodeAgent test failed:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace available');
    return false;
  }
}

testExplainAgent().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
