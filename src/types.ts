export interface CreateNewProjectProps {
  id?: number
  project_name: string
  image: string
  resolution: number
  origin: number[]
  negate: number
  occupied_thresh: number
  free_thresh: number
  pgm_url: string
  png_url: string
  yaml_url: string
  created_time?: string
}
export interface PGMSizeProps {
  width: string
  height: string
}
