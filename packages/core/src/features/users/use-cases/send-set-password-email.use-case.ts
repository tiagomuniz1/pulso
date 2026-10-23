import { userService } from '../services/users.service'

export async function sendSetPasswordEmailUseCase(id: string): Promise<void> {
  await userService.sendSetPasswordEmail(id)
}
