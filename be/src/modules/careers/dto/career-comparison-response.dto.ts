export class CareerComparisonResponseDto {
  id!: string;
  userId!: string;
  careersToCompare!: {
    careerId: string;
    careerTitle: string;
  }[];
  comparisonCriteria!: any;
  comparisonResults!: any;
  createdAt!: Date;
  updatedAt!: Date;
}