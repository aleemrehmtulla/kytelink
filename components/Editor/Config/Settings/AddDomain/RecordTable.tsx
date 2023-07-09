import { useEffect, useState } from 'react'

import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  VStack,
  HStack,
  Link,
  Button,
  Box,
  Divider,
  Text,
  Spacer,
  Tooltip,
} from '@chakra-ui/react'
import { BiTrash, BiCheckCircle } from 'react-icons/bi'
import { RiErrorWarningLine } from 'react-icons/ri'

import { TUser } from 'types/user'

type RecordTableProps = {
  user: TUser
  setUser: (userData: TUser) => void
  domain: string
}

const RecordTable = ({ user, setUser, domain }: RecordTableProps) => {
  const [isMisConfigured, setIsMisConfigured] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const handleValidate = async () => {
    setRefreshing(true)
    setTimeout(async () => {
      const checkdomain = await fetch('/api/domains/checkdomain', {
        method: 'POST',
        body: JSON.stringify({ domain }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await checkdomain.json()

      setIsMisConfigured(result)
      setRefreshing(false)
    }, 400)
  }

  const handleDelete = async (domain: string) => {
    if (!user.domains) return

    const newDomains = user.domains.filter((d: string) => d !== domain)
    setUser({ ...user, domains: newDomains })

    await fetch('/api/domains/deletedomain', {
      method: 'POST',
      body: JSON.stringify({ domain }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  useEffect(() => {
    handleValidate()
    if (isMisConfigured) {
      const yo = setInterval(async () => {
        await handleValidate()
        if (isMisConfigured) {
          clearInterval(yo)
        }
      }, 10000)
    }
  }, [])
  return (
    <VStack align="left " border="1px" borderColor="gray.200" rounded="lg" p={4} mb={2}>
      <HStack spacing={4}>
        <Link href={`https://${domain}`}>{domain}</Link>
        <Spacer />
        <Button
          bg="transparent"
          h="fit"
          py="1.5"
          px={8}
          _focus={{
            boxShadow: 'none',
          }}
          variant="outline"
          isLoading={refreshing}
          onClick={handleValidate}
        >
          Refresh
        </Button>
        <Box
          cursor="pointer"
          _hover={{
            opacity: 0.8,
          }}
          _active={{ transform: 'scale(0.95)' }}
          transitionDuration="300ms"
          as={BiTrash}
          onClick={() => handleDelete(domain)}
          size="1.5em"
        />
      </HStack>
      <HStack color={isMisConfigured ? 'orange.600' : 'green.600'}>
        <Box as={isMisConfigured ? RiErrorWarningLine : BiCheckCircle} size="1em" />
        <Tooltip label={'msg @aleemrehmtulla on twitter if broken!'}>
          <Text fontSize="sm">{isMisConfigured ? 'Awaiting Configuration' : 'Good to go'}</Text>
        </Tooltip>
      </HStack>

      <Divider />

      <Text fontSize="xs">Please the following record on your DNS provider to continue:</Text>
      <Hi domain={domain} />
    </VStack>
  )
}
export default RecordTable

const Hi = ({ domain }: any) => {
  const isSubdomain = domain.split('.').length > 2
  const subdomain = isSubdomain ? domain.split('.')[0] : null

  return (
    <TableContainer fontSize="xs">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Type</Th>
            <Th>Name</Th>
            <Th>Value</Th>
          </Tr>
        </Thead>

        <Tbody>
          {!isSubdomain && (
            <Tr>
              <Td>A</Td>
              <Td>@</Td>
              <Td>76.76.21.21</Td>
            </Tr>
          )}
          <Tr>
            <Td>CNAME</Td>
            <Td>{isSubdomain ? subdomain : 'www'}</Td>
            <Td>cname.vercel-dns.com</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  )
}
