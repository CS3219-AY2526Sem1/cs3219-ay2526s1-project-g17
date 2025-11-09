export function formSectionUrl(sessionId, questionId, language) {
    return `/collaboration/${sessionId}?questionId=${questionId}&language=${language}`;
}
