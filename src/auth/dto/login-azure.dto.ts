import { IsNotEmpty, IsString } from 'class-validator';

export class LoginAzureDto {
  @IsString()
  @IsNotEmpty()
  azureIdToken: string;
}
