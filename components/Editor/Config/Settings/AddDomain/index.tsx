import { useEffect, useState } from 'react'

import { Button, Heading, VStack, Text, HStack, Box } from '@chakra-ui/react'
import { AiOutlinePlus } from 'react-icons/ai'

import DomainInput from './DomainInput'
import EditUsername from './EditUsername'
import RecordTable from './RecordTable'
import { TUser } from 'types/user'

const AddDomain = ({ user, setUser }: { user: TUser; setUser: (user: TUser) => void }) => {
  const [domain, setDomain] = useState<string>('')
  const [addingDomain, setAddingDomain] = useState<boolean>(false)

  const fetchDomains = async () => {
    const domainData = await fetch('/api/domains/fetchdomains', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id }),
      headers: { 'Content-Type': 'application/json' },
    })

    const domains = await domainData.json()
    setUser({ ...user, domains })
  }

  useEffect(() => {
    if (!user || user.domains) return
    fetchDomains()
  }, [])

  return (
    <VStack align="left" border="1px" borderColor="gray.200" rounded="lg" p={4}>
      <Heading pb={4} fontSize="2xl">
        Domains
      </Heading>
      <EditUsername user={user} setUser={setUser} />
      <VStack align="left" spacing={2} pt={3}>
        <Box w="full">
          <Text fontWeight="semibold" pb={2}>
            Custom domain names (beta)
          </Text>
          {!addingDomain ? (
            <Button
              leftIcon={<AiOutlinePlus />}
              colorScheme="black"
              _focus={{
                boxShadow: 'none',
              }}
              _hover={{ bg: 'gray.100', opacity: 0.8 }}
              transitionDuration="400ms"
              py={1}
              h="fit"
              color="black"
              fontWeight="medium"
              onClick={() => setAddingDomain(true)}
              mb={2}
            >
              Add Domain
            </Button>
          ) : (
            <>
              <HStack w="full" pb={2} spacing={0}>
                <DomainInput
                  user={user}
                  setUser={setUser}
                  domain={domain}
                  setDomain={setDomain}
                  setAddingDomain={setAddingDomain}
                />
              </HStack>
            </>
          )}

          {user.domains &&
            user.domains.map((domain: string) => (
              <VStack key={domain} align="left" spacing={2}>
                <RecordTable user={user} setUser={setUser} domain={domain} />
              </VStack>
            ))}
        </Box>
      </VStack>
    </VStack>
  )
}
export default AddDomain
