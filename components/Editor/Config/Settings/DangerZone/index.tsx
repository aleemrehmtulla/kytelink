import { Button, Heading, VStack, Text, Input, useToast } from '@chakra-ui/react'
import { debounce } from 'lodash'
import { KyteProdContext } from 'pages/_app'
import { useContext, useState } from 'react'

import { TKyteProdContext, TUser } from 'types/user'
import ChangeEmailModal from './ChangeEmailModal'

type DangerProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const DangerZone = ({ user, setUser }: DangerProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  const toast = useToast()
  const { kyteProd } = useContext(KyteProdContext) as TKyteProdContext

  const validateDebouncer = debounce((email: string) => {
    validate(email)
  }, 200)

  const validate = async (email: string | undefined) => {
    if (!email || email.length < 3) {
      setIsValid(false)
      return false
    }

    if (email === kyteProd?.email) {
      setIsValid(false)
      toast({
        title: `Whoops! You can't change your email to your current email.`,
        status: 'error',
        duration: 3000,
        position: 'bottom-end',
      })
      return false
    }

    if (!email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
      setIsValid(false)
      return false
    }

    setIsValid(true)
    setUser({ ...user, email })
    return true
  }

  const handleChangeEmail = async () => {
    const isValid = await validate(user.email)
    if (!isValid) return
    setModalOpen(true)
  }

  return (
    <>
      <ChangeEmailModal modalOpen={modalOpen} setModalOpen={setModalOpen} email={user.email} />
      <VStack align="left" border="1px" borderColor="gray.200" rounded="lg" p={4}>
        <Heading fontSize="2xl">Danger Zone 🚧</Heading>
        <VStack align="left" spacing={2}>
          <Text fontWeight="semibold" pb={1}>
            These actions are irreversible
          </Text>

          <VStack align="left" spacing={4}>
            <VStack align="left" spacing={2}>
              <Heading fontSize="md">Change account email</Heading>
              <Input
                _hover={{ bg: 'gray.100' }}
                _focus={{
                  bg: 'gray.100',
                  borderColor: isValid === null ? 'gray.500' : isValid ? 'green.500' : 'red.500',
                }}
                borderColor={isValid === null ? 'gray.300' : isValid ? 'green.600' : 'red.500'}
                transitionDuration="350ms"
                onChange={(e) => {
                  validateDebouncer(e.target.value)
                }}
                defaultValue={user.email}
                placeholder="arib@musicfy.lol"
              />
              <Button
                colorScheme="blue"
                onClick={handleChangeEmail}
                isDisabled={isValid === null ? false : isValid === false ? true : false}
                _hover={isValid !== false ? { opacity: 0.8 } : {}}
                _active={isValid !== false ? { opacity: 0.5 } : {}}
              >
                Change email
              </Button>
            </VStack>
          </VStack>
        </VStack>
      </VStack>
    </>
  )
}
export default DangerZone
