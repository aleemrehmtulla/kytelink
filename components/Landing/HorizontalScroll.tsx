import { Heading, HStack, Stack, Text, VStack, useBreakpointValue } from '@chakra-ui/react'
import Image from 'next/image'

const HorizontalScroll = () => {
  const names = [
    {
      name: 'thedockpod',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/thedockpod1663641993117',
      color: 'purple.200',
      link: 'https://kytelink.com/thedockpod',
    },
    {
      name: 'hamza',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/hamza1663813623520',
      color: 'purple.200',
      link: 'https://kytelink.com/hamza',
    },
    {
      name: 'ted',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/ted1663851140407',
      color: 'purple.200',
      link: 'https://kytelink.com/ted',
    },
    {
      name: 'momin',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/momin1663030561475',
      color: 'purple.200',
      link: 'https://kytelink.com/momin',
    },
    {
      name: 'khulud',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/magika1663961928642',
      color: 'purple.200',
      link: 'https://kytelink.com/magika',
    },

    {
      name: 'aleem',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/aleem1662012148689',
      color: 'purple.200',
      link: 'https://kytelink.com/aleem',
    },
    {
      name: 'aahil',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/aahil1663639087244',
      color: 'purple.200',
      link: 'https://kytelink.com/aahil',
    },
    {
      name: 'amani',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/amani1663998264699',
      color: 'purple.200',
      link: 'https://kytelink.com/amani',
    },
    {
      name: 'abhay',
      pfp: 'https://d1fdloi71mui9q.cloudfront.net/KxswECNlQiSrTzXsk8fr_lEdA97svu11j0tlS',
      color: 'purple.200',
      link: 'https://kytelink.com/abhay',
    },
    {
      name: 'amaya',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/amaya1663305953922',
      color: 'purple.200',
      link: 'https://kytelink.com/amaya',
    },
    {
      name: 'diya',
      pfp: 'https://i.ibb.co/fMTZWQ3/image.png',
      color: 'purple.200',
      link: 'https://kytelink.com/diya',
    },
    {
      name: 'virgil',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/virgil1662779296966',
      color: 'purple.200',
      link: 'https://kytelink.com/virigl',
    },
    {
      name: 'nino',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/nino1662778920827',
      color: 'purple.200',
      link: 'https://kytelink.com/nino',
    },
    {
      name: 'adriana',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/adriana1662842755689',
      color: 'purple.200',
      link: 'https://kytelink.com/adriana',
    },
    {
      name: 'kian',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/kian1662070316404',
      color: 'purple.200',
      link: 'https://kytelink.com/kian',
    },
    {
      name: 'patch',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/patchbaker1663508058634',
      color: 'purple.200',
      link: 'https://kytelink.com/patchbaker',
    },
  ]
  const names2 = [
    {
      name: 'erik',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/erik_solorzano11663192807112',
      color: 'purple.200',
      link: 'https://kytelink.com/erik_solorzano1',
    },
    {
      name: 'ray',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/ray1663192571040',
      color: 'purple.200',
      link: 'https://kytelink.com/ray',
    },
    {
      name: 'radhika',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/radhikabhavsar1663693011981',
      color: 'purple.200',
      link: 'https://kytelink.com/radhikabhavsar',
    },
    {
      name: 'brandon',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/chino1663194780279',
      color: 'purple.200',
      link: 'https://kytelink.com/chino',
    },
    {
      name: 'lukas',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/phoenix1663195552374',
      color: 'purple.200',
      link: 'https://kytelink.com/phoenix',
    },
    {
      name: 'david',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/david1663192715979',
      color: 'purple.200',
      link: 'https://kytelink.com/david',
    },
    {
      name: 'celso',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/garciacelso_1663194676323',
      color: 'purple.200',
      link: 'https://kytelink.com/garciacelso_',
    },
    {
      name: 'sharvin',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/sharvin1663208446954',
      color: 'purple.200',
      link: 'https://kytelink.com/sharvin',
    },
    {
      name: 'azfar',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/azfarasikhansee1663107754120',
      color: 'purple.200',
      link: 'https://kytelink.com/azfarasikhansee',
    },
    {
      name: 'alex',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/shaq1663289134684',
      color: 'purple.200',
      link: 'https://kytelink.com/shaq',
    },
    {
      name: 'midha',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/midha1663418072443',
      color: 'purple.200',
      link: 'https://kytelink.com/midha',
    },
    {
      name: 'emanuel',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/emanuel1663214143320',
      color: 'purple.200',
      link: 'https://kytelink.com/emanuel',
    },
    {
      name: 'ibrahim',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/ibrahim1663001894123',
      color: 'purple.200',
      link: 'https://kytelink.com/ibrahim',
    },
    {
      name: 'zahid',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/zahid1663960532900',
      color: 'purple.200',
      link: 'https://kytelink.com/zahid',
    },
    {
      name: 'dylan',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/dylxn1663527648922',
      color: 'purple.200',
      link: 'https://kytelink.com/dylan',
    },
    {
      name: 'shayan',
      pfp: 'https://rijytzcvtfszqvbxesej.supabase.co/storage/v1/object/public/avatars/test/shayan1663574643402',
      color: 'purple.200',
      link: 'https://kytelink.com/shayan',
    },
  ]
  const Names2Duplicated = [...names2, ...names2, ...names2, ...names2]
  const NamesDuplicated = [...names, ...names, ...names, ...names]

  const imageSize = useBreakpointValue({ base: 32, md: 40 })
  return (
    <VStack pt={{ base: 24, md: 8 }} pb={14}>
      <Stack direction={{ base: 'column', md: 'row' }} textAlign="center" spacing={2} pb={12}>
        <Heading fontSize={{ base: '4xl', md: '5xl' }} color="black">
          Join the
        </Heading>
        <Heading px={1} bg="purple.200" fontSize={{ base: '4xl', md: '5xl' }} fontWeight="black">
          countless others
        </Heading>
        <Heading fontSize={{ base: '4xl', md: '5xl' }} color="black">
          using kyte
        </Heading>
      </Stack>
      <div className="container">
        {NamesDuplicated.map((name, index) => {
          return (
            <HStack rounded="md" bg={name.color} key={index} spacing={4} w="fit" h="1" p={3}>
              <Image
                src={name?.pfp}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
                height={imageSize}
                width={imageSize}
              />
              <Text fontSize="sm" color="black">
                {name.name}
              </Text>
            </HStack>
          )
        })}
      </div>
      <div className="container2">
        {Names2Duplicated.map((name, index) => {
          return (
            <HStack rounded="md" bg={name.color} key={index} spacing={4} w="fit" p={4}>
              <Image
                src={name?.pfp}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
                height={imageSize}
                width={imageSize}
              />
              <Text fontSize="sm" color="black">
                {name.name}
              </Text>
            </HStack>
          )
        })}
      </div>
    </VStack>
  )
}
export default HorizontalScroll
