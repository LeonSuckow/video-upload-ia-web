import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload, CircleDashed, Check, AlertCircle } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from '@ffmpeg/util'
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success' | 'error'
const statusMessage = {
  waiting: 'Converter video',
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Enviando...',
  success: 'Upload finalizado',
  error: 'Falha no envio'

}
interface VideoInputFormProps {
  onVideoUploaded: (videoId: string) => void;
}
export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('waiting');
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }
    const selectedFile = files.item(0);
    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log('convert started')
    const ffmpeg = await getFFmpeg();
    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    // ffmpeg.on('log', (log) => console.log(log))

    ffmpeg.on('progress', (progress) => {
      console.log(`Convert progress: ${Math.round(progress.progress * 100)}`)
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ])
    const data = await ffmpeg.readFile('output.mp3')
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg'
    })

    console.log('Convert finished');
    return audioFile;
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = promptInputRef.current?.value

    if (!videoFile) {
      return;
    }

    setStatus('converting')
    const audioFile = await convertVideoToAudio(videoFile)
    console.log(audioFile, prompt)

    const data = new FormData();
    data.append('file', audioFile)

    setStatus('uploading')
    const response = await api.post('/videos', data)

    const videoId = response.data.video.id
    setStatus('generating')
    await api.post(`/videos/${videoId}/transcription`, {
      prompt
    })

    setStatus('success')
    
    props.onVideoUploaded(videoId)
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  }, [videoFile])
  return (
    <form className='space-y-6' onSubmit={handleUploadVideo}>
      <label
        htmlFor="video"
        className='relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5'
      >
        {previewURL ? (
          <video src={previewURL} controls={false} className="pointer-events-none inset-0"></video>
        ) : (
          <>
            <FileVideo className='w-4 h-4' />
            Selecione um vídeo
          </>
        )}
      </label>
      <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected} />
      <Separator />
      <div className='space-y-2'>
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          disabled={status !== 'waiting'}
          ref={promptInputRef}
          id='transcription_prompt'
          className='h-20 resize-none leading-relaxed'
          placeholder='Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)'
        />
      </div>
      <Button
        disabled={status !== 'waiting'}
        type='submit'
        className='w-full data-[error=true]:bg-red-500 data-[error=true]:text-white data-[success=true]:bg-emerald-500 data-[success=true]:text-white ease duration-300'
        data-success={status === 'success'}
        data-error={status === 'error'}
      >
        {status === 'waiting' && (
          <>
            {statusMessage[status]}
            <Upload className='h-4 w-4 ml-2' />
          </>
        )}

        {status !== 'waiting' && status !== 'success' && status !== 'error' && (
          <>
            {statusMessage[status]}
            <CircleDashed className='h-4 w-4 ml-2 animate-spin' />
          </>
        )}

        {status === 'success' && (
          <>
            {statusMessage[status]}
            <Check className='h-4 w-4 ml-2' />
          </>
        )}

        {status === 'error' && (
          <>
            {statusMessage[status]}
            <AlertCircle className='h-4 w-4 ml-2' />
          </>
        )}
      </Button>
    </form>
  )
}