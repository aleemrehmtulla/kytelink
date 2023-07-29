import { ChangeEvent, useRef, useState } from 'react'

import { Button, Heading, Image, Spinner, Text, useToast, VStack } from '@chakra-ui/react'

import { AiOutlineCloudUpload } from 'react-icons/ai'

import { TUser } from 'types/user'
import { uploadFile } from 'lib/uploadfile'
import { MODAL_TYPE } from '.'

type GetStartedModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  setModalType: (modalType: MODAL_TYPE) => void
}

export enum LOADING_STATE {
  untouched = 'untouched',
  loading = 'loading',
  uploaded = 'uploaded',
}

const SelectAvatar = ({ user, setUser, setModalType }: GetStartedModalProps) => {
  const toast = useToast()
  const [dragActive, setDragActive] = useState(false)
  const [loadingState, setLoadingState] = useState('untouched') as any
  const inputRef = useRef(null)

  const handleDrag = function (e: ChangeEvent<any>) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = function (e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSaveAvatar(e.dataTransfer.files[0])
    }
  }

  const handleChange = function (e: any) {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleSaveAvatar(e.target.files[0])
    }
  }

  const handleSaveAvatar = async (avatarFile: File) => {
    setLoadingState('loading')
    const { imageURL, blurpfp, error } = await uploadFile(avatarFile, true)

    if (!imageURL || error) {
      toast({ title: 'Error', description: error, status: 'error' })
      setLoadingState('untouched')
      return
    }

    setUser({ ...user, pfp: imageURL, blurpfp: blurpfp || '' })
    setLoadingState('uploaded')
    setModalType(MODAL_TYPE.selectName)
  }

  const onButtonClick = () => {
    // @ts-ignore gives error for null, optinal chaning still wont precent .click
    inputRef.current.click()
  }

  return (
    <>
      <VStack align="center" textAlign="center" pt={12} spacing={4}>
        <Heading fontSize={{ base: 'lg', md: 'xl' }}>🎉 Your Kyte is live 🎉</Heading>
        <Text fontSize={{ base: 'sm', md: 'md' }}>2/3! Toss in a profile picture :)</Text>
        <VStack align="left" spacing={0} w={{ base: 'fit', md: '20rem' }}>
          {loadingState === 'untouched' && (
            <form
              id="uploadProfilePicture"
              onDragEnter={handleDrag}
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                id="input-file-upload"
                multiple={true}
                onChange={handleChange}
              />

              <VStack
                _hover={{ bg: 'gray.100' }}
                cursor="pointer"
                bg={dragActive ? 'gray.100' : 'white'}
                transitionDuration="0.3s"
                mb={4}
                borderStyle="dashed"
                borderWidth="1px"
                borderRadius="md"
                p={4}
                w="full"
                onClick={onButtonClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <AiOutlineCloudUpload size={48} />
                <Text fontSize="sm" color="gray.500">
                  Drag and drop or click to upload
                </Text>
              </VStack>
            </form>
          )}
          {loadingState === 'loading' && (
            <VStack bg="gray.200" mb={4} borderWidth="1px" borderRadius="md" p={4} py={20} w="100%">
              <Spinner />
            </VStack>
          )}

          {loadingState === 'uploaded' && (
            <VStack mb={4} w="100%">
              <Image src={user.pfp} boxSize="48" w="fit" borderRadius="md" />
            </VStack>
          )}

          <Button
            bg="black"
            color="white"
            _focus={{ boxShadow: 'none' }}
            transitionDuration="0.5s"
            _hover={loadingState !== 'uploaded' ? {} : { opacity: 0.8 }}
            isDisabled={loadingState !== 'uploaded'}
            onClick={() => setModalType(MODAL_TYPE.selectName)}
          >
            Continue 👀
          </Button>
        </VStack>
      </VStack>
    </>
  )
}

export default SelectAvatar
