import { GoogleGenAI } from "@google/genai";
import { Video } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeChannelPerformance = async (channelName: string, videos: Video[]) => {
  try {
    const videoDataStr = videos.map(v => 
      `- 제목: "${v.title}" | 조회수: ${v.stats?.viewCount} | 좋아요: ${v.stats?.likeCount} | 댓글: ${v.stats?.commentCount} | 날짜: ${v.publishedAt.split('T')[0]}`
    ).join('\n');

    const prompt = `
      당신은 유튜브 분석 전문가입니다. 다음은 채널 "${channelName}"의 최근 동영상 성과 데이터입니다.
      
      데이터:
      ${videoDataStr}

      위 데이터를 바탕으로 다음 항목을 포함한 간결한 인사이트 리포트를 한국어 마크다운 형식으로 작성해주세요:
      1. **전반적인 성과 추세**: 최근 조회수가 상승세인가요, 하락세인가요?
      2. **최고 성과 콘텐츠**: 조회수와 참여도(좋아요/댓글)를 기준으로 어떤 주제나 스타일이 가장 반응이 좋은가요?
      3. **참여도 분석**: 좋아요나 댓글 수에서 눈에 띄는 특이점이 있나요?
      4. **실질적인 조언**: 크리에이터를 위한 구체적인 제안 한 가지를 해주세요.

      어조는 전문적이면서도 격려하는 톤으로 유지해주세요. 가독성을 위해 글머리 기호를 사용해주세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating insight:", error);
    return "인사이트 생성에 실패했습니다. API 설정을 확인해주세요.";
  }
};