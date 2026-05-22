export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  emailTaken: () => new AppError('EMAIL_TAKEN', 409, 'Cet email est déjà utilisé'),
  invalidCredentials: () =>
    new AppError('INVALID_CREDENTIALS', 401, 'Email ou mot de passe incorrect'),
  invalidRefreshToken: () =>
    new AppError('INVALID_REFRESH_TOKEN', 401, 'Refresh token invalide ou expiré'),
  fileNotFound: () => new AppError('FILE_NOT_FOUND', 404, 'Fichier introuvable'),
  mimeNotAllowed: (mime: string) =>
    new AppError('MIME_TYPE_NOT_ALLOWED', 415, `Type de fichier non autorisé : ${mime}`),
  quotaExceeded: () =>
    new AppError('QUOTA_EXCEEDED', 413, 'Quota de stockage dépassé'),
  shareNotFound: () =>
    new AppError('SHARE_NOT_FOUND', 404, 'Lien de partage introuvable'),
  shareExpired: () => new AppError('SHARE_EXPIRED', 410, 'Ce lien a expiré'),
  shareLimitReached: () =>
    new AppError('SHARE_LIMIT_REACHED', 410, 'Limite de téléchargements atteinte'),
  passwordRequired: () =>
    new AppError('PASSWORD_REQUIRED', 401, 'Ce lien est protégé par un mot de passe'),
  wrongPassword: () => new AppError('WRONG_PASSWORD', 403, 'Mot de passe incorrect'),
  fileNotReady: () =>
    new AppError('FILE_NOT_READY', 503, 'Le fichier n\'est pas encore disponible'),
  downloadNotPermitted: () =>
    new AppError('DOWNLOAD_NOT_PERMITTED', 403, 'Le téléchargement n\'est pas autorisé sur ce lien'),
  folderNotFound: () =>
    new AppError('FOLDER_NOT_FOUND', 404, 'Dossier introuvable'),
  folderNotEmpty: () =>
    new AppError('FOLDER_NOT_EMPTY', 409, 'Le dossier n\'est pas vide'),
  invalidFilename: () =>
    new AppError('INVALID_FILENAME', 400, 'Nom de fichier invalide'),
  forbidden: () =>
    new AppError('FORBIDDEN', 403, 'Permissions insuffisantes'),
  unauthorized: () =>
    new AppError('UNAUTHORIZED', 401, 'Authentification requise'),
}
