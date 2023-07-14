import { Button } from '@chakra-ui/react'

type ConvertButtonProps = {
  signup: () => void
  width?: string
  text?: string
}

const ConvertButton = ({ signup, text, width }: ConvertButtonProps) => {
  return (
    <Button
      onClick={signup}
      bg="purple.500"
      size="lg"
      w={width || 'full'}
      color="white"
      _hover={{ opacity: 0.8 }}
      _active={{ opacity: 0.6 }}
      _focus={{ outline: 'none' }}
    >
      {text || 'Start Now'}
    </Button>
  )
}

export default ConvertButton
