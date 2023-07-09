/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore - ts doesn't know about the extension.

import { useState } from 'react'

import { Box, useColorModeValue, VStack } from '@chakra-ui/react'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'

import { TLink, TUser } from 'types/user'
import LinkModal from '../LinkModal'

import { reorder } from './Helper'
import Link from './Link'

type LinksProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const Links = ({ user, setUser }: LinksProps) => {
  const containerColor = useColorModeValue('lightContainer', 'darkContainer')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLink, setSelectedLink] = useState(null)

  const links = user.links

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return
    }
    const items = reorder(user.links, result.source.index, result.destination.index) as TLink[]
    setUser({ ...user, links: items })
  }

  const openTest = (todo: any) => {
    setSelectedLink(todo)
    setModalOpen(true)
  }

  return (
    <>
      {links.length > 0 && (
        <Box>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable">
              {(provided: any) => (
                <VStack
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  bg={containerColor}
                  spacing={3}
                >
                  {links.map((todo: any, index: any) => (
                    <Draggable
                      key={`${todo.tite}${todo.link}${todo.emoji}`}
                      draggableId={`${todo.tite}${todo.link}${todo.emoji}` + ''}
                      index={index}
                    >
                      {(provided: any) => (
                        <Box
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          ref={provided.innerRef}
                          w="full"
                          mt="10px"
                          onClick={() => openTest(todo)}
                        >
                          <Link key={`${todo.tite}${todo.link}${todo.emoji}`} linkData={todo} />
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </VStack>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      )}
      <LinkModal
        user={user}
        setUser={setUser}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        selectedLink={selectedLink}
        isEdit={true}
      />
    </>
  )
}

export default Links
