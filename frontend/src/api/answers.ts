import { api } from './client'

export const answersApi = {
  submit: (sessionCode: string, questionIndex: number, choice: string) =>
    api.post('/api/answers', {
      session_code: sessionCode,
      question_index: questionIndex,
      choice,
    }),
}
