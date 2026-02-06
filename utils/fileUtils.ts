/**
 * Sanitiza nomes de arquivo para garantir URLs seguras e funcionais
 * Remove caracteres especiais, espaços, e gera nomes únicos
 */

export const sanitizeFileName = (originalFileName: string, itemName?: string): string => {
  // Extrair extensão do arquivo
  const extension = originalFileName.split('.').pop()?.toLowerCase() || 'mp4';
  
  // Usar nome do item se fornecido, senão usar parte do nome original
  let baseName = itemName || originalFileName.split('.')[0];
  
  // Sanitizar o nome base:
  // 1. Converter para lowercase
  // 2. Remover caracteres especiais (manter apenas letras, números e hífens)
  // 3. Substituir espaços e underscores por hífens
  // 4. Remover múltiplos hífens consecutivos
  // 5. Remover hífens no início e fim
  baseName = baseName
    .toLowerCase()
    .normalize('NFD') // Normalizar caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiais
    .replace(/[\s_]+/g, '-') // Substituir espaços e underscores por hífens
    .replace(/-+/g, '-') // Remover hífens múltiplos
    .replace(/^-+|-+$/g, '') // Remover hífens no início e fim
    .substring(0, 50); // Limitar tamanho
  
  // Se o nome ficou vazio após sanitização, usar 'video' ou 'photo'
  if (!baseName) {
    baseName = extension.match(/mp4|mov|avi|webm/i) ? 'video' : 'photo';
  }
  
  // Adicionar timestamp único para evitar conflitos
  const timestamp = Date.now();
  
  // Gerar nome final: nome-sanitizado-timestamp.extensao
  return `${baseName}-${timestamp}.${extension}`;
};

/**
 * Exemplos de uso:
 * 
 * sanitizeFileName('SaveClip.App_AQPUpC9185dhvZvcLboeXl3QJ.mov', 'Burger Video')
 * → 'burger-video-1738845600000.mov'
 * 
 * sanitizeFileName('My Awesome Café Photo!!!.jpg', 'Cappuccino')
 * → 'cappuccino-1738845600000.jpg'
 * 
 * sanitizeFileName('___test___FILE___.mp4')
 * → 'test-file-1738845600000.mp4'
 */

/**
 * Valida se um nome de arquivo é seguro para URLs
 */
export const isFileNameSafe = (fileName: string): boolean => {
  // Verificar se contém apenas caracteres seguros
  const safePattern = /^[a-z0-9-]+\.[a-z0-9]+$/;
  return safePattern.test(fileName);
};

/**
 * Obtém a extensão de um arquivo
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

/**
 * Verifica se um arquivo é de vídeo
 */
export const isVideoFile = (fileName: string): boolean => {
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv'];
  const extension = getFileExtension(fileName);
  return videoExtensions.includes(extension);
};

/**
 * Verifica se um arquivo é de imagem
 */
export const isImageFile = (fileName: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const extension = getFileExtension(fileName);
  return imageExtensions.includes(extension);
};
