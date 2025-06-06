// Re-export OpenAI from the actual package now that it's installed
import OpenAI from 'openai'
export { OpenAI }
export type { ChatCompletionMessage, ChatCompletion as ChatCompletionResponse } from 'openai/resources/chat/completions'
export default OpenAI