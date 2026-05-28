/**
 * WORD v2 — LLM Chinese Semantic Judgment Module
 * Uses DeepSeek API (OpenAI-compatible) to judge if Chinese answers match in meaning.
 */
WORD.LLM = {};

// In-memory cache for identical queries
WORD.LLM._cache = {};

/**
 * Check if two Chinese answers are semantically equivalent.
 * @param {string} correctAnswer - The standard answer
 * @param {string} userAnswer - The user's answer
 * @returns {Promise<{correct: boolean, confidence: number}>}
 */
WORD.LLM.checkAnswer = async function (correctAnswer, userAnswer) {
  // If LLM is disabled, fall back to exact match
  if (!WORD.state.llm.enabled) {
    return { correct: WORD.Utils.compareChinese(correctAnswer, userAnswer), confidence: 1 };
  }

  // If either is empty, no need for LLM
  if (!correctAnswer || !userAnswer) {
    return { correct: false, confidence: 1 };
  }

  // Quick exact match short-circuit (no API call needed)
  if (WORD.Utils.compareChinese(correctAnswer, userAnswer)) {
    return { correct: true, confidence: 1 };
  }

  // Check cache
  var cacheKey = correctAnswer + '|||' + userAnswer;
  if (WORD.LLM._cache[cacheKey]) {
    return WORD.LLM._cache[cacheKey];
  }

  // Call DeepSeek API with retry
  var result = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      result = await WORD.LLM._callAPI(correctAnswer, userAnswer);
      break;
    } catch (err) {
      if (attempt === 1) {
        // Final fallback: exact match after cleaning
        return { correct: WORD.Utils.compareChinese(correctAnswer, userAnswer), confidence: 0.5 };
      }
      // Wait 1s before retry
      await new Promise(function (r) { setTimeout(r, 1000); });
    }
  }

  // Cache and return
  if (result) {
    WORD.LLM._cache[cacheKey] = result;
  }
  return result || { correct: WORD.Utils.compareChinese(correctAnswer, userAnswer), confidence: 0.5 };
};

WORD.LLM._callAPI = async function (correctAnswer, userAnswer) {
  var systemPrompt = '你是一个中文语义判断助手。你需要判断用户的答案是否与标准答案意思一致。对于以下判断规则：\n' +
    '1. 如果意思相同或非常接近 → correct: true, confidence: 0.9-1.0\n' +
    '2. 如果意思部分正确但不完全 → correct: false, confidence: 0.3-0.7\n' +
    '3. 如果意思完全不同 → correct: false, confidence: 0.0-0.2\n' +
    '4. 注意：近义词、同义表达应判定为正确（如"快乐"和"高兴"）\n' +
    '5. 重要：英文单词可能存在一词多义（如"bank"可以是"银行"也可以是"河岸"），用户的中文答案只要是该英文单词的正确释义之一，即使与标准答案不同，也应判定为正确\n' +
    '6. 只返回JSON，不要有任何其他文字。';

  var userMessage = '标准答案：' + correctAnswer + '\n用户答案：' + userAnswer;

  // Timeout after 8 seconds for each LLM call
  var fetchPromise = fetch(WORD.state.llm.apiBase + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + WORD.state.llm.apiKey
    },
    body: JSON.stringify({
      model: WORD.state.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      max_tokens: 100
    })
  });

  var timeoutPromise = new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error('LLM request timeout')); }, 8000);
  });

  var response = await Promise.race([fetchPromise, timeoutPromise]);

  if (!response.ok) {
    var errorText = '';
    try { errorText = await response.text(); } catch (e) {}
    throw new Error('LLM API error ' + response.status + ': ' + errorText);
  }

  var data = await response.json();
  var content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';

  // Parse JSON from response
  try {
    // Try to extract JSON object from content
    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      return {
        correct: !!parsed.correct,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      };
    }
  } catch (e) {
    // Fall through to fallback
  }

  // Fallback: if LLM returned something unexpected, use exact match
  return { correct: WORD.Utils.compareChinese(correctAnswer, userAnswer), confidence: 0.5 };
};

/**
 * Batch review wrong answers with a lenient standard.
 * Used after initial test scoring to see if any wrong answers can be salvaged.
 * @param {Array} items - [{correct, user, type: 'en'|'ch'}, ...]
 * @returns {Promise<boolean[]>} - Array of booleans in same order
 */
WORD.LLM.batchReview = async function (items) {
  if (!WORD.state.llm.enabled || !items.length) {
    return items.map(function () { return false; });
  }

  // Filter out empty answers — they stay wrong
  var validItems = [];
  var validIndices = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].user && items[i].correct) {
      validItems.push(items[i]);
      validIndices.push(i);
    }
  }

  if (!validItems.length) {
    return items.map(function () { return false; });
  }

  var systemPrompt = '你是一个宽松的中文语义评判助手。请判断学生的中文答案是否可以被接受为正确。\n' +
    '判断标准（宽松）：核心意思一致即可，近义词、同义表达都应接受。\n' +
    '特别注意：英文单词可能存在一词多义（如"bank"既是"银行"也是"河岸"），学生给出的中文只要是该英文单词的正确释义之一，即使与标准答案不同，也应判对。\n' +
    '返回JSON数组：[{"index": 0, "correct": true/false}, ...]，只返回JSON，不要其他文字。';

  var userMessage = validItems.map(function (item, i) {
    var typeLabel = item.type === 'en' ? '英文' : '中文';
    return (i + 1) + '. [' + typeLabel + '] 标准答案：' + item.correct + ' | 学生答案：' + item.user;
  }).join('\n');

  try {
    var fetchPromise = fetch(WORD.state.llm.apiBase + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + WORD.state.llm.apiKey
      },
      body: JSON.stringify({
        model: WORD.state.llm.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        max_tokens: 500
      })
    });

    var timeoutPromise = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('Review timeout')); }, 20000);
    });

    var response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      throw new Error('API error ' + response.status);
    }

    var data = await response.json();
    var content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    // Parse JSON array from response
    var jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      var result = items.map(function () { return false; });
      for (var j = 0; j < parsed.length; j++) {
        var entry = parsed[j];
        if (entry && typeof entry.index === 'number' && entry.correct) {
          var origIdx = validIndices[entry.index];
          if (typeof origIdx === 'number') {
            result[origIdx] = true;
          }
        }
      }
      return result;
    }
  } catch (e) {
    // On any error, return all false (keep original wrong status)
  }

  return items.map(function () { return false; });
};

/**
 * Test the LLM connection with a simple query.
 */
WORD.LLM.testConnection = async function () {
  try {
    var result = await WORD.LLM._callAPI('快乐', '高兴');
    return { success: true, message: 'LLM 连接成功！' };
  } catch (err) {
    return { success: false, message: '连接失败：' + err.message };
  }
};
